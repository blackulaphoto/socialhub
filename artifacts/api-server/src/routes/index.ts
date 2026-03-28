import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import postsRouter from "./posts.js";
import artistsRouter from "./artists.js";
import messagesRouter from "./messages.js";
import searchRouter from "./search.js";
import adminRouter from "./admin.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use(postsRouter);
router.use(artistsRouter);
router.use("/messages", messagesRouter);
router.use(searchRouter);
router.use(adminRouter);

export default router;
