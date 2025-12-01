import { Router } from "express";
import userRouter from "./user.routes";
import videoRouter from "./video.routes";

const api = Router();

api.use("/users", userRouter);
api.use("/videos", videoRouter);

export default api;
