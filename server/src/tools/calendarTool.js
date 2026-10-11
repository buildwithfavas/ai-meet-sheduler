import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { timeToMinutes } from "../utils/dateTimeUtils.js";
import { connectDB } from "../config/db.js";
import { Meeting } from "../models/Meeting.js";
import { CalendarEvent } from "../models/CalendarEvent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to generate official-format Google Meet URL (xxx-yyyy-zzz)
 */
export function generateGoogleMeetLink() {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const seg = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`;
}

/**
 * Loads attendee profiles dynamically from knowledge/attendee_profiles.json
 */
export function getAttendeeProfiles() {
  try {
    const profilesPath = path.resolve(__dirname, "../../knowledge/attendee_profiles.json");
    if (fs.existsSync(profilesPath)) {
      return JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
    }
  } catch (err) {
    console.warn("⚠️ Could not load attendee_profiles.json:", err.message);
  }
  return [];
}

/**
 * Seeds default baseline calendar events into MongoDB if database collection is empty
 */
async function ensureCalendarInitialized() {
  await connectDB();

  const count = await CalendarEvent.countDocuments();
  if (count === 0) {
    console.log("🍃 [MongoDB] Seeding initial baseline calendar events into database...");
    const profiles = getAttendeeProfiles();
    const seedEvents = [];

    profiles.forEach((profile, idx) => {
      const email = profile.email?.toLowerCase();
      if (!email) return;

      if (idx === 0) {
        seedEvents.push(
          { attendee: email, date: "2026-10-14", startTime: "10:00", endTime: "11:00", title: "Product Roadmap Sync" },
          { attendee: email, date: "2026-10-14", startTime: "14:00", endTime: "15:00", title: "Sprint Planning Session" }
        );
      } else if (idx === 1) {
        seedEvents.push(
          { attendee: email, date: "2026-10-14", startTime: "14:30", endTime: "16:00", title: "Architecture & Code Review" }
        );
      } else if (idx === 2) {
        seedEvents.push(
          { attendee: email, date: "2026-10-14", startTime: "11:00", endTime: "12:00", title: "Tech Team Retro" }
        );
      }
    });

    if (seedEvents.length > 0) {
      await CalendarEvent.insertMany(seedEvents);
      console.log(`✅ [MongoDB] Seeded ${seedEvents.length} initial calendar events.`);
    }
  }
}

/**
 * Calendar Tool for querying availability and booking via MongoDB
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

      // Buffer violation
      const hasBufferViolation = (startMins < busyEnd + bufferMins && startMins >= busyEnd) ||
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
