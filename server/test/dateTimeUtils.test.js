import {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  getTodayISO,
  formatDateDMY,
  getDateDetails,
  convertTimeToTimezone
} from "../src/utils/dateTimeUtils.js";

console.log("🧪 [Test] Running dateTimeUtils tests...");

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

// Test 1: Time conversion math
assert(timeToMinutes("14:30") === 870, "timeToMinutes converts '14:30' to 870");
assert(minutesToTime(870) === "14:30", "minutesToTime converts 870 to '14:30'");
assert(minutesToTime(0) === "00:00", "minutesToTime converts 0 to '00:00'");

// Test 2: Accurate duration addition
assert(addMinutesToTime("10:00", 45) === "10:45", "addMinutesToTime 10:00 + 45m = 10:45");
assert(addMinutesToTime("13:45", 30) === "14:15", "addMinutesToTime crosses hour 13:45 + 30m = 14:15");

// Test 3: Date formatting
assert(formatDateDMY("2026-10-15") === "15-10-2026", "formatDateDMY formats '2026-10-15' to '15-10-2026'");

// Test 4: Day metadata & Focus Friday detection
const fridayMeta = getDateDetails("2026-10-16");
assert(fridayMeta && fridayMeta.dayName === "Friday", "Detects Friday day name");
assert(fridayMeta && fridayMeta.isFriday === true, "Detects isFriday flag as true");
assert(fridayMeta && fridayMeta.isWeekend === false, "Friday is not a weekend");

const weekendMeta = getDateDetails("2026-10-18");
assert(weekendMeta && weekendMeta.isWeekend === true, "Detects Sunday as weekend");

// Test 5: Today ISO
const today = getTodayISO();
assert(/^\d{4}-\d{2}-\d{2}$/.test(today), `getTodayISO returns valid YYYY-MM-DD (${today})`);

// Test 6: Cross-timezone conversion
const nyTime = convertTimeToTimezone("2026-10-16", "19:30", "Asia/Kolkata", "America/New_York");
assert(nyTime === "10:00", `Converts 19:30 IST to 10:00 EST (Result: ${nyTime})`);

console.log(`\n📊 [dateTimeUtils Summary] ${passed}/${total} assertions passed.\n`);
