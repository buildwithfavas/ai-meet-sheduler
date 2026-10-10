/**
 * Google Calendar Integration Tool
 * Generates official Google Calendar direct-add links with Google Meet video conferences
 */

/**
 * Formats date and time into Google Calendar UTC format: YYYYMMDDTHHmmssZ
 */
function formatToGCalDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  return dt.toISOString().replace(/-|:|\.\d\d\d/g, "");
}

export const GoogleCalendarTool = {
  /**
   * Generates a direct Google Calendar web event creation link with Google Meet pre-configured
   */
  generateGoogleCalendarUrl({ title, date, startTime, endTime, attendees = [], agenda = [], meetingLink = "" }) {
    const startFormatted = formatToGCalDateTime(date, startTime);
    const endFormatted = formatToGCalDateTime(date, endTime);

    const description = [
      `🎥 Google Meet Video Conference: ${meetingLink}`,
      "",
      `Meeting Topic: ${title}`,
      "",
      "Agenda:",
      ...agenda.map(a => `• ${a}`),
      "",
      "Scheduled autonomously by AI Meeting Scheduler (LangGraph Multi-Agent System)"
    ].join("\n");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${startFormatted}/${endFormatted}`,
      details: description,
      location: meetingLink, // Directly passes the Google Meet URL as location
      add: attendees.join(",")
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  },

  /**
   * Generates RFC 5545 standard .ics iCalendar file with Google Meet video link
   */
  generateIcsContent({ title, date, startTime, endTime, attendees = [], agenda = [], meetingLink = "" }) {
    const startFormatted = formatToGCalDateTime(date, startTime);
    const endFormatted = formatToGCalDateTime(date, endTime);
    const uid = `meet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@acme.com`;

    const description = [
      `Meeting Topic: ${title}`,
      `Google Meet: ${meetingLink}`,
      agenda.map(a => `- ${a}`).join("\\n")
    ].join("\\n");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AI Meeting Scheduler//LangGraph Multi-Agent//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${startFormatted}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${meetingLink}`,
      `URL:${meetingLink}`,
      `X-GOOGLE-CONFERENCE:${meetingLink}`,
      ...attendees.map(email => `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`),
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
  }
};
