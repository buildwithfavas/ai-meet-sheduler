import { Router } from "express";
import { healthController } from "../controllers/healthController.js";

const router = Router();

router.get("/health", healthController.getHealth);
router.post("/test-connection", healthController.testConnection);

export default router;
