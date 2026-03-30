import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import postsRouter from "./posts.js";
import artistsRouter from "./artists.js";
import messagesRouter from "./messages.js";
import searchRouter from "./search.js";
import adminRouter from "./admin.js";
import groupsRouter from "./groups.js";
import eventsRouter from "./events.js";
import activityRouter from "./activity.js";
import reportsRouter from "./reports.js";
import analyticsRouter from "./analytics.js";
import uploadsRouter from "./uploads.js";
import siteRouter from "./site.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use(postsRouter);
router.use(artistsRouter);
router.use("/messages", messagesRouter);
router.use(searchRouter);
router.use(activityRouter);
router.use(groupsRouter);
router.use(eventsRouter);
router.use(reportsRouter);
router.use(analyticsRouter);
router.use(uploadsRouter);
router.use(siteRouter);
router.use(adminRouter);

export default router;
