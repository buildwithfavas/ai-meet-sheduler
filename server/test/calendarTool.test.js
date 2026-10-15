import { CalendarTool } from "../src/tools/calendarTool.js";
import { getTodayISO } from "../src/utils/dateTimeUtils.js";
import mongoose from "mongoose";

console.log("🧪 [Test] Running calendarTool tests...");

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

async function run() {
  const today = getTodayISO();

  // Test 1: Query free windows
  const freeWindows = await CalendarTool.getFreeWindows(today, 30, ["uvamal11@gmail.com"]);
  assert(Array.isArray(freeWindows), "getFreeWindows returns an array");
  assert(freeWindows.length > 0, `Found ${freeWindows.length} free window(s) on ${today}`);

  // Test 2: Check lunch block is excluded
  const lunchSlotCheck = await CalendarTool.checkSlotAvailability(today, "13:00", "13:30", ["uvamal11@gmail.com"]);
  // Availability check passes if no DB busy block, but freeWindows excludes 13:00-14:00
  const overlapsLunch = freeWindows.some(w => {
    return w.startTime <= "13:00" && w.endTime >= "14:00";
  });
  assert(!overlapsLunch, "Free windows do not span across protected lunch block (13:00-14:00)");

  // Test 3: Deterministic fallback slot finder
  const fallbackSlot = await CalendarTool.findFirstCompliantSlot(today, 30, "morning", ["uvamal11@gmail.com"]);
  assert(fallbackSlot !== null, "findFirstCompliantSlot finds a valid morning slot");
  assert(fallbackSlot.startTime && fallbackSlot.endTime, `Found slot: ${fallbackSlot.startTime} - ${fallbackSlot.endTime}`);

  console.log(`\n📊 [calendarTool Summary] ${passed}/${total} assertions passed.\n`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
