/**
 * Converts standard date format (e.g. "2026-10-15" or ISO string) to DD-MM-YYYY format
 * @param {string} dateStr
 * @returns {string} Formatted date as "DD-MM-YYYY"
 */
export function formatDateToDMY(dateStr) {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}-${m}-${y}`;
  }
  return dateStr;
}
