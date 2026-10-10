import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getLLM } from "./config/llm.js";
import { HumanMessage } from "@langchain/core/messages";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testModelConnectivity() {
  console.log("\n=======================================================");
  console.log("  🔍 Testing Multi-Provider LLM Configuration");
  console.log("=======================================================");

  // 1. Test Ollama (Primary)
  console.log("\n1️⃣  Testing Primary Provider: Ollama (Local)...");
  try {
    const ollamaLlm = getLLM("ollama");
    const t0 = Date.now();
    const res = await ollamaLlm.invoke([
      new HumanMessage("Respond with: 'Ollama primary online' and model name.")
    ]);
    const d = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`✅ Ollama Responded (${d}s): ${typeof res.content === "string" ? res.content.trim() : JSON.stringify(res.content)}`);
  } catch (err) {
    console.error("❌ Ollama connection failed:", err.message);
  }

  // 2. Test OpenRouter (Fallback)
  console.log("\n2️⃣  Testing Fallback Provider: OpenRouter (Cloud)...");
  try {
    const openRouterLlm = getLLM("openrouter");
    const t0 = Date.now();
    const res = await openRouterLlm.invoke([
      new HumanMessage("Respond with: 'OpenRouter fallback online'.")
    ]);
    const d = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`✅ OpenRouter Responded (${d}s): ${typeof res.content === "string" ? res.content.trim() : JSON.stringify(res.content)}`);
  } catch (err) {
    console.log("ℹ️ OpenRouter status:", err.message);
  }

  console.log("\n🎉 LLM Healthcheck Completed!\n");
}

testModelConnectivity();
