import { getLLM } from "../config/llm.js";
import { HumanMessage } from "@langchain/core/messages";
import mongoose from "mongoose";

export const healthController = {
  /**
   * GET /api/health
   */ 
  getHealth(req, res) {
    res.json({
      status: "online",
      activeProvider: process.env.LLM_PROVIDER || "ollama",
      ollamaModel: process.env.OLLAMA_MODEL || "llama3.2:latest",
      openRouterModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.startsWith("sk-or-")),
      emailConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      mongoConnected: mongoose.connection.readyState === 1
    });
  },

  /**
   * POST /api/test-connection
   */
  async testConnection(req, res) {
    const { provider } = req.body;
    const targetProvider = provider || process.env.LLM_PROVIDER || "ollama";
    const startTime = Date.now();

    try {
      const llm = getLLM(targetProvider);
      const response = await llm.invoke([
        new HumanMessage("Respond with: 'AI Connection verified' and model name.")
      ]);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      res.json({
        success: true,
        provider: targetProvider,
        latencySeconds: duration,
        response: typeof response.content === "string" ? response.content.trim() : JSON.stringify(response.content)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        provider: targetProvider,
        error: error.message
      });
    }
  }
};
