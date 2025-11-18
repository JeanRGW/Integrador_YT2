import { Router } from "express";
import * as videoController from "../controllers/video.controller";
import { validate } from "src/middlewares/validate";
import { createVideo, updateVideo } from "src/schemas/videoSchemas";
import { auth } from "src/middlewares/auth";
import { uploadVideo } from "src/middlewares/uploadVideo";

const router = Router();

router.post(
	"/",
	auth,
	uploadVideo.single("video"),
	validate({ bodySchema: createVideo }),
	videoController.createVideo,
);

router.get("/:id", videoController.getVideo);

router.put("/:id", auth, validate({ bodySchema: updateVideo }), videoController.updateVideo);

export default router;
