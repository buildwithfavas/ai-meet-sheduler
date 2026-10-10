import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./src/routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mount API Routes (MVC Pattern)
app.use("/api", apiRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`\n🚀 Agentic Backend Server running on http://localhost:${PORT}`);
  console.log(`   Healthcheck: http://localhost:${PORT}/api/health`);
});
