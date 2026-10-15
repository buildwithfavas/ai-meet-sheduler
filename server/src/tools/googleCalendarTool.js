/**
 * Google Calendar Integration Tool
 * Generates official Google Calendar direct-add links and RFC 5545 .ics calendar files with Google Meet video conferences
 */

/**
 * Formats local date and time into YYYYMMDDTHHmmss (without trailing Z so ctz governs)
 */
function formatToLocalGCalDateTime(dateStr, timeStr) {
  const cleanDate = dateStr.replace(/-/g, "");
  const cleanTime = timeStr.replace(/:/g, "").padEnd(4, "0") + "00";
  return `${cleanDate}T${cleanTime}`;
}

export const GoogleCalendarTool = {
  /**
   * Generates a direct Google Calendar web event creation link with Google Meet pre-configured
   */
  generateGoogleCalendarUrl({ title, date, startTime, endTime, timezone = "Asia/Kolkata", attendees = [], agenda = [], meetingLink = "" }) {
    const startFormatted = formatToLocalGCalDateTime(date, startTime);
    const endFormatted = formatToLocalGCalDateTime(date, endTime);

    const description = [
      `🎥 Google Meet Video Conference: ${meetingLink}`,
      "",
      `Meeting Topic: ${title}`,
      "",
      "Agenda:",
      ...(agenda || []).map(a => `• ${a}`),
      "",
      "Scheduled autonomously by AI Meeting Scheduler (LangGraph Multi-Agent System)"
    ].join("\n");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${startFormatted}/${endFormatted}`,
      ctz: timezone,
      details: description,
      location: meetingLink, // Directly passes the Google Meet URL as location
      add: attendees.join(",")
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  },

  /**
   * Generates RFC 5545 standard .ics iCalendar file with timezone and Google Meet video link
   */
  generateIcsContent({ title, date, startTime, endTime, timezone = "Asia/Kolkata", attendees = [], agenda = [], meetingLink = "" }) {
    const startFormatted = formatToLocalGCalDateTime(date, startTime);
    const endFormatted = formatToLocalGCalDateTime(date, endTime);
    const uid = `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@acme.com`;

    const description = [
      `Meeting Topic: ${title}`,
      `Google Meet: ${meetingLink}`,
      (agenda || []).map(a => `- ${a}`).join("\\n")
    ].join("\\n");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AI Meeting Scheduler//LangGraph Multi-Agent//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${startFormatted}Z`,
      `DTSTART;TZID=${timezone}:${startFormatted}`,
      `DTEND;TZID=${timezone}:${endFormatted}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${meetingLink}`,
      `URL:${meetingLink}`,
      `X-GOOGLE-CONFERENCE:${meetingLink}`,
      ...(attendees || []).map(email => `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`),
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
  }
};
