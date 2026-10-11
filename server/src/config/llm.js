import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Creates Ollama model instance
 */
function createOllamaModel() {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2:latest";

  return new ChatOllama({
    baseUrl,
    model,
    temperature: 0.1,
  });
}

/**
 * Creates OpenRouter model instance (if API key is present)
 */
function createOpenRouterModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    return null;
  }

  const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const modelName = process.env.OPENROUTER_MODEL || "openai/gpt-4o";

  return new ChatOpenAI({
    baseURL,
    apiKey,
    modelName,
    temperature: 0.1,
    configuration: {
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "AI Meeting Scheduler"
      }
    }
  });
}

/**
 * Factory function providing Ollama as primary with automatic OpenRouter fallback
 * @param {string} [preferredProvider] - 'ollama' (default) or 'openrouter'
 * @returns {ChatOllama | ChatOpenAI}
 */
export function getLLM(preferredProvider = process.env.LLM_PROVIDER || "ollama") {
  const provider = preferredProvider.toLowerCase();
  const ollama = createOllamaModel();
  const openRouter = createOpenRouterModel();

  if (!openRouter) {
    return ollama;
  }

  if (provider === "ollama") {
    return ollama.withFallbacks({ fallbacks: [openRouter] });
  }

  if (provider === "openrouter") {
    return openRouter.withFallbacks({ fallbacks: [ollama] });
  }

  return ollama.withFallbacks({ fallbacks: [openRouter] });
}
