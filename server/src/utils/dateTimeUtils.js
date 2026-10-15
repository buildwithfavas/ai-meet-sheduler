/**
 * Shared Date & Time Utilities (Server)
 * Comprehensive utilities for deterministic time calculations, timezone handling, and date validation
 */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Parses "HH:mm" time string into minutes since midnight
 * @param {string} timeStr - e.g. "14:30"
 * @returns {number} minutes since midnight
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(":");
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight back into "HH:mm" format
 * @param {number} totalMinutes
 * @returns {string} e.g. "14:30"
 */
export function minutesToTime(totalMinutes) {
  const norm = Math.max(0, Math.min(24 * 60 - 1, Math.floor(totalMinutes)));
  const hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Accurately adds durationMinutes to a "HH:mm" string
 * @param {string} startTime - "10:00"
 * @param {number} durationMinutes - 45
 * @returns {string} "10:45"
 */
export function addMinutesToTime(startTime, durationMinutes = 30) {
  const startMins = timeToMinutes(startTime);
  return minutesToTime(startMins + Number(durationMinutes));
}

/**
 * Returns today's ISO date string (YYYY-MM-DD) based on local system time
 * @returns {string} e.g. "2026-10-15"
 */
export function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats standard date (YYYY-MM-DD) to DD-MM-YYYY format
 * @param {string} dateStr - e.g. "2026-10-15"
 * @returns {string} Formatted as "DD-MM-YYYY"
 */
export function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : dateStr;
}

/**
 * Analyzes target date string and returns comprehensive metadata
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {{
 *   date: string,
 *   dayOfWeek: number,
 *   dayName: string,
 *   isWeekend: boolean,
 *   isFriday: boolean,
 *   isPast: boolean,
 *   isToday: boolean,
 *   formattedDMY: string
 * }}
 */
export function getDateDetails(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Construct UTC date to avoid timezone shift on date boundaries
  const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = dt.getUTCDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const dayName = DAYS[dayOfWeek];

  const todayStr = getTodayISO();
  const isPast = dateStr < todayStr;
  const isToday = dateStr === todayStr;

  return {
    date: dateStr,
    dayOfWeek,
    dayName,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isFriday: dayOfWeek === 5,
    isPast,
    isToday,
    formattedDMY: `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`
  };
}

/**
 * Creates a UTC Date object representing a specific local date and time in a given IANA timezone
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} timeStr - "HH:mm"
 * @param {string} timeZone - e.g. "Asia/Kolkata" or "America/New_York"
 * @returns {Date}
 */
export function getZonedDate(dateStr, timeStr, timeZone = "UTC") {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);

  try {
    const utcGuess = new Date(Date.UTC(y, m - 1, d, h, min));
    const invDate = new Date(utcGuess.toLocaleString("en-US", { timeZone: "UTC" }));
    const targetDate = new Date(utcGuess.toLocaleString("en-US", { timeZone }));
    const diff = invDate.getTime() - targetDate.getTime();
    return new Date(utcGuess.getTime() + diff);
  } catch (err) {
    // Fallback if timezone string is invalid
    return new Date(Date.UTC(y, m - 1, d, h, min));
  }
}

/**
 * Converts a time in a source timezone to a target timezone
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} timeStr - "HH:mm"
 * @param {string} sourceTz - e.g. "Asia/Kolkata"
 * @param {string} targetTz - e.g. "America/New_York"
 * @returns {string} "HH:mm" in target timezone
 */
export function convertTimeToTimezone(dateStr, timeStr, sourceTz = "UTC", targetTz = "UTC") {
  if (sourceTz === targetTz) return timeStr;
  try {
    const zonedDt = getZonedDate(dateStr, timeStr, sourceTz);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: targetTz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(zonedDt);
  } catch (err) {
    return timeStr;
  }
}

/**
 * Generates attendee local time breakdown for an invitation
 * @param {string} dateStr
 * @param {string} startTime
 * @param {string} endTime
 * @param {string} baseTimezone
 * @param {Array<{ name: string, email: string, timezone: string }>} attendeeProfiles
 * @returns {Array<{ attendee: string, email: string, timezone: string, localTime: string }>}
 */
export function computeAttendeeLocalTimes(dateStr, startTime, endTime, baseTimezone = "Asia/Kolkata", attendeeProfiles = []) {
  return attendeeProfiles.map(profile => {
    const targetTz = profile.timezone || baseTimezone;
    const localStart = convertTimeToTimezone(dateStr, startTime, baseTimezone, targetTz);
    const localEnd = convertTimeToTimezone(dateStr, endTime, baseTimezone, targetTz);
    return {
      attendee: profile.name,
      email: profile.email,
      timezone: targetTz,
      localTime: `${localStart} - ${localEnd} (${targetTz.split("/")[1]?.replace(/_/g, " ") || targetTz})`
    };
  });
}
