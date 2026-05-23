import { Router } from "express";
import userRouter from "./user.routes";
import videoRouter from "./video.routes";
import likeRouter from "./like.routes";
import commentRouter from "./comment.routes";

const api = Router();

api.get("/health", (_req, res) => {
	res.json({ status: "ok", uptime: process.uptime() });
});

api.use("/users", userRouter);
api.use("/videos", videoRouter);
api.use("/likes", likeRouter);
api.use("/comments", commentRouter);

export default api;
