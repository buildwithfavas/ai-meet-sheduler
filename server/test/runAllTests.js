import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  "dateTimeUtils.test.js",
  "jsonUtils.test.js",
  "guardrail.test.js",
  "calendarTool.test.js",
  "googleCalendarTool.test.js",
  "connection.test.js"
];

console.log("=========================================");
console.log("🚀 Starting AI Meeting Scheduler Test Suite");
console.log("=========================================\n");

let anyFailed = false;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  const fileUrl = pathToFileURL(filePath).href;

  console.log(`▶ Running ${file}...`);
  try {
    await import(fileUrl);
    console.log(`✔ ${file} completed.\n`);
  } catch (err) {
    anyFailed = true;
    console.error(`❌ ${file} threw an error:`, err);
  }
}

console.log("=========================================");
if (!anyFailed && process.exitCode !== 1) {
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("💥 SOME TESTS FAILED. PLEASE REVIEW LOGS.");
  process.exit(1);
}
