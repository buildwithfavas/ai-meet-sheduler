import { GoogleCalendarTool } from "../src/tools/googleCalendarTool.js";

console.log("🧪 [Test] Running googleCalendarTool tests...");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ Passed: ${message}`);
  } else {
    console.error(`  ❌ Failed: ${message}`);
    process.exitCode = 1;
  }
}

// Test 1: URL format with ctz and local times
const url = GoogleCalendarTool.generateGoogleCalendarUrl({
  title: "Roadmap Sync",
  date: "2026-10-16",
  startTime: "10:00",
  endTime: "10:30",
  timezone: "Asia/Kolkata",
  attendees: ["favas@example.com"],
  meetingLink: "https://meet.google.com/abc-defg-hij"
});

assert(url.includes("ctz=Asia%2FKolkata"), "Google Calendar URL contains ctz timezone parameter");
assert(url.includes("dates=20261016T100000%2F20261016T103000"), "Google Calendar URL dates format is accurate");
assert(url.includes("location=https%3A%2F%2Fmeet.google.com"), "Google Calendar URL location contains Meet link");

// Test 2: .ics RFC 5545 format
const ics = GoogleCalendarTool.generateIcsContent({
  title: "Roadmap Sync",
  date: "2026-10-16",
  startTime: "10:00",
  endTime: "10:30",
  timezone: "Asia/Kolkata",
  attendees: ["favas@example.com"],
  meetingLink: "https://meet.google.com/abc-defg-hij"
});

assert(ics.includes("DTSTART;TZID=Asia/Kolkata:20261016T100000"), ".ics contains TZID on DTSTART");
assert(ics.includes("DTEND;TZID=Asia/Kolkata:20261016T103000"), ".ics contains TZID on DTEND");
assert(ics.includes("BEGIN:VCALENDAR") && ics.includes("END:VCALENDAR"), ".ics has valid VCALENDAR envelope");

console.log(`\n📊 [googleCalendarTool Summary] ${passed}/${total} assertions passed.\n`);
