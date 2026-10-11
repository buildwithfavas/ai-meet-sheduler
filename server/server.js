import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./src/routes/index.js";
import { connectDB } from "./src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.listen(PORT, async () => {
  console.log(`\n🚀 Agentic Backend Server running on http://localhost:${PORT}`);
  try {
    await connectDB();
  } catch (err) {
    console.error("⚠️ Initial MongoDB connection failed, will retry on request:", err.message);
  }
});
