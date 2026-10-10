/**
 * Shared Date & Time Utilities (Server)
 */

/**
 * Parses "HH:mm" time string into minutes since midnight
 * @param {string} timeStr - e.g. "14:30"
 * @returns {number} minutes since midnight
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
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
