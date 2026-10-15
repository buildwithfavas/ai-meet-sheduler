import { extractAndParseJSON } from "../src/utils/jsonUtils.js";

console.log("🧪 [Test] Running jsonUtils tests...");

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

// Test 1: Direct JSON string
const direct = '{"status":"APPROVED","violations":[]}';
const parsed1 = extractAndParseJSON(direct);
assert(parsed1 && parsed1.status === "APPROVED", "Parse clean direct JSON");

// Test 2: Markdown code fence with preamble and postamble
const markdown = `
Here is the result you requested:
\`\`\`json
{
  "meetingObjective": "Sprint Retro",
  "candidateSlots": [
    {
      "slotId": "slot-1",
      "startTime": "10:00",
      "endTime": "10:30"
    }
  ]
}
\`\`\`
Hope this helps!
`;
const parsed2 = extractAndParseJSON(markdown);
assert(parsed2 && parsed2.meetingObjective === "Sprint Retro", "Extract JSON from markdown code fence");

// Test 3: Trailing commas
const trailingComma = `{
  "topic": "Strategy",
  "slots": ["10:00", "11:00",],
  "active": true,
}`;
const parsed3 = extractAndParseJSON(trailingComma);
assert(parsed3 && parsed3.topic === "Strategy" && parsed3.slots.length === 2, "Sanitize and parse JSON with trailing commas");

// Test 4: Fallback on completely invalid string
const fallback = { status: "FALLBACK" };
const parsed4 = extractAndParseJSON("Sorry, I cannot produce JSON today.", fallback);
assert(parsed4 && parsed4.status === "FALLBACK", "Return fallback on unparseable output");

console.log(`\n📊 [jsonUtils Summary] ${passed}/${total} assertions passed.\n`);
