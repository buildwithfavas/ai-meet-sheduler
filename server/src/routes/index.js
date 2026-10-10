import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import meetingRoutes from "./meetingRoutes.js";

const apiRouter = Router();

apiRouter.use("/", healthRoutes);
apiRouter.use("/", meetingRoutes);

export default apiRouter;
