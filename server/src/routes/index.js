import { Router } from "express";
import meetingRoutes from "./meetingRoutes.js";

const apiRouter = Router();

apiRouter.use("/", meetingRoutes);

export default apiRouter;
