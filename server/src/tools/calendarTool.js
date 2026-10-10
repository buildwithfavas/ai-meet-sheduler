import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { timeToMinutes } from "../utils/dateTimeUtils.js";

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
 * In-memory Mock Calendar Store keyed by attendee emails from attendee_profiles.json
 */
const CALENDAR_STORE = {};

function ensureCalendarInitialized() {
  const profiles = getAttendeeProfiles();
  if (profiles.length > 0 && Object.keys(CALENDAR_STORE).length === 0) {
    profiles.forEach((profile, idx) => {
      const email = profile.email?.toLowerCase();
      if (!email) return;

      if (idx === 0) {
        CALENDAR_STORE[email] = [
          { date: "2026-10-14", startTime: "10:00", endTime: "11:00", title: "Product Roadmap Sync" },
          { date: "2026-10-14", startTime: "14:00", endTime: "15:00", title: "Sprint Planning Session" }
        ];
      } else if (idx === 1) {
        CALENDAR_STORE[email] = [
          { date: "2026-10-14", startTime: "14:30", endTime: "16:00", title: "Architecture & Code Review" }
        ];
      } else if (idx === 2) {
        CALENDAR_STORE[email] = [
          { date: "2026-10-14", startTime: "11:00", endTime: "12:00", title: "Tech Team Retro" }
        ];
      } else {
        CALENDAR_STORE[email] = [];
      }
    });
  }
}


/**
 * Calendar Tool for querying availability and booking
 */
export const CalendarTool = {
  /**
   * Returns busy intervals for requested attendees on a given date
   */
  getBusySlots(date, attendeeEmails) {
    ensureCalendarInitialized();
    const results = [];
    for (const email of attendeeEmails) {
      const events = CALENDAR_STORE[email.toLowerCase()] || [];
      const dayEvents = events.filter(e => e.date === date);
      results.push(...dayEvents.map(e => ({ attendee: email, ...e })));
    }
    return results;
  },

  /**
   * Verifies if a given slot is available for all attendees, accounting for 15-min buffers
   */
  checkSlotAvailability(date, startTime, endTime, attendeeEmails) {
    ensureCalendarInitialized();
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const bufferMins = 15; // Company policy 15-minute buffer requirement

    const conflicts = [];
    const busySlots = this.getBusySlots(date, attendeeEmails);

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
   * Commits the meeting booking to the calendar store
   */
  bookMeeting(meeting) {
    ensureCalendarInitialized();
    for (const email of meeting.attendees) {
      const normalized = email.toLowerCase();
      if (!CALENDAR_STORE[normalized]) {
        CALENDAR_STORE[normalized] = [];
      }
      CALENDAR_STORE[normalized].push({
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        title: meeting.title
      });
    }

    return {
      success: true,
      bookingId: `MEET-${Date.now()}`,
      meetingLink: meeting.meetingLink || generateGoogleMeetLink(),
      confirmedAttendees: meeting.attendees
    };
  }
};
