import { Router } from "express";
import * as videoController from "../controllers/video.controller";
import { validate } from "src/middlewares/validate";
import {
	updateVideo,
	initiateVideo,
	completeVideo,
	processedWebhook,
} from "src/schemas/videoSchemas";
import { auth } from "src/middlewares/auth";
import { transcoderAuth } from "src/middlewares/transcoderAuth";

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

router.get("/:id", videoController.getVideo);

// List videos owned by a given user
router.get("/user/:userId", videoController.getUserVideos);

// Get a presigned streaming URL for a video stored in S3
router.get("/:id/stream", videoController.streamVideo);

router.put("/:id", auth, validate({ bodySchema: updateVideo }), videoController.updateVideo);

// Webhook to finalize processed videos (called by transcoder)
router.post(
	"/processed",
	transcoderAuth,
	validate({ bodySchema: processedWebhook }),
	videoController.processedWebhook,
);

// Simple job feed for transcoder polling
router.get("/jobs/pending", transcoderAuth, videoController.getPendingJobs);

// Claim a job (mark as processing) and mark failed
router.post("/jobs/claim", transcoderAuth, videoController.claimJob);
router.post("/jobs/failed", transcoderAuth, videoController.markJobFailed);

// List pending upload jobs for the authenticated user
router.get("/pending", auth, videoController.getUserPendingJobs);

export default router;
