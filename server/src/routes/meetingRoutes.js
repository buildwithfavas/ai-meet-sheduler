import { Router } from "express";
import { meetingController } from "../controllers/meetingController.js";

const router = Router();

router.post("/schedule", meetingController.scheduleMeeting);
router.post("/schedule/stream", meetingController.scheduleMeetingStream);
router.get("/knowledge", meetingController.getKnowledge);
router.get("/calendar", meetingController.getCalendar);
router.get("/meetings", meetingController.getMeetings);

export default router;
