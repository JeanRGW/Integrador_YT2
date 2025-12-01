import { Router } from "express";
import * as videoController from "../controllers/video.controller";
import { validate } from "src/middlewares/validate";
import { createVideo, updateVideo, initiateVideo, completeVideo } from "src/schemas/videoSchemas";
import { auth } from "src/middlewares/auth";
import { uploadVideo } from "src/middlewares/uploadVideo";
import { extendTimeout } from "src/middlewares/extendTimeout";

const router = Router();

// Presigned upload flow
router.post(
	"/initiate",
	auth,
	validate({ bodySchema: initiateVideo }),
	videoController.initiateUpload,
);

router.post(
	"/complete",
	auth,
	validate({ bodySchema: completeVideo }),
	videoController.completeUpload,
);

router.post(
	"/initiate",
	auth,
	validate({ bodySchema: initiateVideo }),
	videoController.initiateUpload,
);

router.get("/:id", videoController.getVideo);

// List videos owned by a given user
router.get("/user/:userId", videoController.getUserVideos);

// Get a presigned streaming URL for a video stored in S3
router.get("/:id/stream", videoController.streamVideo);

router.put("/:id", auth, validate({ bodySchema: updateVideo }), videoController.updateVideo);

export default router;
