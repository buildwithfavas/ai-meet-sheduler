import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  getTodayISO,
  getDateDetails
} from "../utils/dateTimeUtils.js";
import { connectDB } from "../config/db.js";
import { Meeting } from "../models/Meeting.js";
import { CalendarEvent } from "../models/CalendarEvent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance cache flags
let isCalendarInitialized = false;
let cachedProfiles = null;

/**
 * Helper to generate official-format Google Meet URL (xxx-yyyy-zzz)
 */
export function generateGoogleMeetLink() {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const seg = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;
}

/**
 * Loads attendee profiles with in-memory caching
 */
export function getAttendeeProfiles() {
  if (cachedProfiles) return cachedProfiles;
  try {
    const profilesPath = path.resolve(__dirname, "../../knowledge/attendee_profiles.json");
    if (fs.existsSync(profilesPath)) {
      cachedProfiles = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
      return cachedProfiles;
    }
  } catch (err) {
    console.warn("⚠️ Could not load attendee_profiles.json:", err.message);
  }
  return [];
}

/**
 * Helper to get dates for today, tomorrow, and subsequent days
 */
function getRelativeDateStr(offsetDays = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Seeds default baseline calendar events dynamically relative to today
 */
async function ensureCalendarInitialized() {
  if (isCalendarInitialized) return;

  await connectDB();

  const count = await CalendarEvent.countDocuments();
  if (count === 0) {
    console.log("🍃 [MongoDB] Seeding dynamic baseline calendar events into database...");
    const profiles = getAttendeeProfiles();
    const seedEvents = [];

    // Target dynamic today, tomorrow, and a couple upcoming dates
    const datesToSeed = [getTodayISO(), getRelativeDateStr(1), getRelativeDateStr(2)];

    profiles.forEach((profile, idx) => {
      const email = profile.email?.toLowerCase();
      if (!email) return;

      datesToSeed.forEach((targetDate) => {
        if (idx === 0) {
          // Amal: morning sync & early afternoon
          seedEvents.push(
            { attendee: email, date: targetDate, startTime: "10:00", endTime: "11:00", title: "Product Roadmap Sync" },
            { attendee: email, date: targetDate, startTime: "14:00", endTime: "15:00", title: "Sprint Planning Session" }
          );
        } else if (idx === 1) {
          // Favas: late afternoon architecture review
          seedEvents.push(
            { attendee: email, date: targetDate, startTime: "14:30", endTime: "16:00", title: "Architecture & Code Review" }
          );
        } else if (idx === 2) {
          // Bennet: late morning retro
          seedEvents.push(
            { attendee: email, date: targetDate, startTime: "11:00", endTime: "12:00", title: "Tech Team Retro" }
          );
        }
      });
    });

    if (seedEvents.length > 0) {
      await CalendarEvent.insertMany(seedEvents);
      console.log(`✅ [MongoDB] Seeded ${seedEvents.length} initial calendar events.`);
    }
  }

  isCalendarInitialized = true;
}

/**
 * Calendar Tool for querying availability, calculating open windows, and booking via MongoDB
 */
export const CalendarTool = {
  /**
   * Returns busy intervals from MongoDB for requested attendees on a given date
   */
  async getBusySlots(date, attendeeEmails = []) {
    await ensureCalendarInitialized();

    const normalizedEmails = attendeeEmails.map(e => e.toLowerCase().trim());
    const events = await CalendarEvent.find({
      date,
      attendee: { $in: normalizedEmails }
    }).lean();

    return events.map(e => ({
      attendee: e.attendee,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      title: e.title
    }));
  },

  /**
   * Verifies if a given slot is available for all attendees, accounting for 15-min buffers
   */
  async checkSlotAvailability(date, startTime, endTime, attendeeEmails = []) {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const bufferMins = 15; // Company policy 15-minute buffer requirement

    const conflicts = [];
    const busySlots = await this.getBusySlots(date, attendeeEmails);

    for (const slot of busySlots) {
      const busyStart = timeToMinutes(slot.startTime);
      const busyEnd = timeToMinutes(slot.endTime);

      // Direct overlap
      const hasDirectOverlap = (startMins < busyEnd) && (endMins > busyStart);

      // Buffer violation (must have at least 15 min gap before and after)
      const hasBufferViolation =
        (startMins < busyEnd + bufferMins && startMins >= busyEnd) ||
        (endMins > busyStart - bufferMins && endMins <= busyStart);

      if (hasDirectOverlap) {
        conflicts.push({
          attendee: slot.attendee,
          type: "DIRECT_OVERLAP",
          conflictingEvent: `${slot.title} (${slot.startTime} - ${slot.endTime})`
        });
      } else if (hasBufferViolation) {
        conflicts.push({
          attendee: slot.attendee,
          type: "BUFFER_VIOLATION",
          conflictingEvent: `${slot.title} (${slot.startTime} - ${slot.endTime}) needs 15m buffer`
        });
      }
    }

    return {
      available: conflicts.length === 0,
      conflicts
    };
  },

  /**
   * Calculates compliant free windows on a target date for attendees
   * Takes into account business hours (09:00-18:00), lunch (13:00-14:00),
   * Friday post-14:00 restrictions, and 15m attendee buffers
   */
  async getFreeWindows(date, durationMinutes = 30, attendeeEmails = []) {
    const dateMeta = getDateDetails(date);
    if (!dateMeta || dateMeta.isWeekend || dateMeta.isPast) {
      return [];
    }

    const busySlots = await this.getBusySlots(date, attendeeEmails);
    const bufferMins = 15;

    // Working window bounds
    const dayStartMins = 9 * 60; // 09:00
    // If Friday, no meetings after 14:00 (Focus Friday)
    const dayEndMins = dateMeta.isFriday ? 14 * 60 : 18 * 60;

    // Collect all blocked intervals [start, end]
    const blocked = [];

    // Lunch block: 13:00 - 14:00
    blocked.push({ start: 13 * 60, end: 14 * 60, reason: "Daily Lunch Block (13:00-14:00)" });

    // Attendee busy blocks with buffers
    for (const slot of busySlots) {
      const bStart = Math.max(dayStartMins, timeToMinutes(slot.startTime) - bufferMins);
      const bEnd = Math.min(dayEndMins, timeToMinutes(slot.endTime) + bufferMins);
      blocked.push({ start: bStart, end: bEnd, reason: `${slot.attendee}: ${slot.title}` });
    }

    // Sort blocked intervals by start time
    blocked.sort((a, b) => a.start - b.start);

    // Merge overlapping blocked intervals
    const mergedBlocked = [];
    for (const b of blocked) {
      if (mergedBlocked.length === 0) {
        mergedBlocked.push({ ...b });
      } else {
        const last = mergedBlocked[mergedBlocked.length - 1];
        if (b.start <= last.end) {
          last.end = Math.max(last.end, b.end);
        } else {
          mergedBlocked.push({ ...b });
        }
      }
    }

    // Identify open free intervals
    const freeWindows = [];
    let currentPointer = dayStartMins;

    for (const block of mergedBlocked) {
      if (block.start > currentPointer) {
        const windowDuration = block.start - currentPointer;
        if (windowDuration >= durationMinutes) {
          freeWindows.push({
            startTime: minutesToTime(currentPointer),
            endTime: minutesToTime(block.start),
            durationMinutes: windowDuration
          });
        }
      }
      currentPointer = Math.max(currentPointer, block.end);
    }

    if (dayEndMins > currentPointer) {
      const windowDuration = dayEndMins - currentPointer;
      if (windowDuration >= durationMinutes) {
        freeWindows.push({
          startTime: minutesToTime(currentPointer),
          endTime: minutesToTime(dayEndMins),
          durationMinutes: windowDuration
        });
      }
    }

    return freeWindows;
  },

  /**
   * Deterministically finds the first policy-compliant, conflict-free candidate slot
   */
  async findFirstCompliantSlot(date, durationMinutes = 30, timePreference = "", attendeeEmails = [], excludedSlots = []) {
    const freeWindows = await this.getFreeWindows(date, durationMinutes, attendeeEmails);
    const prefLower = (timePreference || "").toLowerCase();
    const isAfternoonPref = prefLower.includes("afternoon") || prefLower.includes("after 3") || prefLower.includes("pm");
    const isMorningPref = prefLower.includes("morning") || prefLower.includes("am");

    // Flatten windows into discrete candidate slots (stepping by 15 or 30 mins)
    const candidateSlots = [];
    for (const win of freeWindows) {
      const winStart = timeToMinutes(win.startTime);
      const winEnd = timeToMinutes(win.endTime);

      for (let s = winStart; s + durationMinutes <= winEnd; s += 15) {
        const slotStart = minutesToTime(s);
        const slotEnd = minutesToTime(s + durationMinutes);

        // Check if excluded (e.g. rejected in previous iterations)
        const isExcluded = excludedSlots.some(ex => ex.startTime === slotStart && ex.endTime === slotEnd);
        if (!isExcluded) {
          candidateSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            startMins: s
          });
        }
      }
    }

    if (candidateSlots.length === 0) {
      return null;
    }

    // Sort by attendee preference
    if (isAfternoonPref) {
      // Prioritize slots at or after 14:00 (or latest available)
      candidateSlots.sort((a, b) => {
        const aIsAfternoon = a.startMins >= 14 * 60 ? 1 : 0;
        const bIsAfternoon = b.startMins >= 14 * 60 ? 1 : 0;
        if (aIsAfternoon !== bIsAfternoon) return bIsAfternoon - aIsAfternoon;
        return a.startMins - b.startMins;
      });
    } else if (isMorningPref) {
      // Prioritize slots between 10:00 and 12:30
      candidateSlots.sort((a, b) => {
        const aScore = Math.abs(a.startMins - 10.5 * 60);
        const bScore = Math.abs(b.startMins - 10.5 * 60);
        return aScore - bScore;
      });
    }

    const best = candidateSlots[0];
    return {
      slotId: `slot-${Date.now().toString(36)}`,
      date,
      startTime: best.startTime,
      endTime: best.endTime,
      timezone: "Asia/Kolkata",
      rationale: "Selected optimal conflict-free compliant window matching policy and calendar availability"
    };
  },

  /**
   * Commits the meeting booking to MongoDB Meeting & CalendarEvent collections
   */
  async bookMeeting(meeting) {
    await ensureCalendarInitialized();

    const bookingId = `MEET-${Date.now()}`;
    const meetingLink = meeting.meetingLink || generateGoogleMeetLink();
    const normalizedAttendees = (meeting.attendees || []).map(a => a.toLowerCase().trim());

    // 1. Save Meeting document into MongoDB
    const newMeeting = await Meeting.create({
      bookingId,
      title: meeting.title,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      durationMinutes: meeting.durationMinutes || 30,
      attendees: normalizedAttendees,
      agenda: meeting.agenda || [],
      meetingLink,
      googleCalendarUrl: meeting.googleCalendarUrl || "",
      status: "CONFIRMED"
    });

    console.log(`🍃 [MongoDB] Saved scheduled meeting "${meeting.title}" (ID: ${bookingId}) to database.`);

    // 2. Insert busy blocks into CalendarEvent for all attendees in MongoDB
    const attendeeCalendarBlocks = normalizedAttendees.map(email => ({
      attendee: email,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      title: `Meeting: ${meeting.title}`,
      bookingId
    }));

    if (attendeeCalendarBlocks.length > 0) {
      await CalendarEvent.insertMany(attendeeCalendarBlocks);
      console.log(`🍃 [MongoDB] Added calendar busy events for ${normalizedAttendees.length} attendee(s).`);
    }

    return {
      success: true,
      bookingId,
      meetingLink,
      confirmedAttendees: normalizedAttendees,
      meetingDoc: newMeeting
    };
  },

  /**
   * Fetches all scheduled meetings from MongoDB
   */
  async getAllMeetings() {
    await connectDB();
    return await Meeting.find().sort({ createdAt: -1 }).lean();
  }
};
