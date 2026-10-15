import { connectDB } from "../src/config/db.js";
import { getLLM } from "../src/config/llm.js";
import { HumanMessage } from "@langchain/core/messages";
import mongoose from "mongoose";

console.log("🧪 [Test] Running connection tests...");

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
  // Test 1: MongoDB Connection
  try {
    await connectDB();
    assert(mongoose.connection.readyState === 1, "MongoDB connected successfully (state: 1)");
  } catch (err) {
    assert(false, `MongoDB connection failed: ${err.message}`);
  }

  // Test 2: LLM Connectivity
  try {
    const llm = getLLM();
    assert(llm !== null, "getLLM() initialized with primary/fallback provider");
  } catch (err) {
    assert(false, `LLM initialization failed: ${err.message}`);
  }

  console.log(`\n📊 [connection Summary] ${passed}/${total} assertions passed.\n`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Connection test error:", err);
  process.exit(1);
});
