import { Router } from "express";
import * as videoController from "../controllers/video.controller";
import { validate } from "src/middlewares/validate";
import { updateVideo, initiateVideo, completeVideo, searchVideos } from "src/schemas/videoSchemas";
import { auth } from "src/middlewares/auth";
import { transcoderAuth } from "src/middlewares/transcoderAuth";
import z from "zod";

const router = Router();

// Search/list videos with filters and pagination
router.get("/", auth(true), validate({ querySchema: searchVideos }), videoController.searchVideos);

// Initiate video upload
router.post(
	"/initiate",
	auth(),
	validate({ bodySchema: initiateVideo }),
	videoController.initiateUpload,
);

// Complete video upload
router.post(
	"/complete",
	auth(),
	validate({ bodySchema: completeVideo }),
	videoController.completeUpload,
);

// Get video by ID
router.get(
	"/:id",
	auth(true),
	validate({
		querySchema: z.object({
			id: z.uuid(),
		}),
	}),
	videoController.getVideo,
);

// Update video details
router.put(
	"/:id",
	auth(),
	validate({ bodySchema: updateVideo, querySchema: z.object({ id: z.uuid() }) }),
	videoController.updateVideo,
);

// Get video stream URL
router.get(
	"/:id/stream",
	auth(true),
	validate({ paramsSchema: z.object({ id: z.uuid() }) }),
	videoController.streamVideo,
);

// Get videos from a specific user
router.get(
	"/user/:userId",
	auth(true),
	validate({ querySchema: z.object({ userId: z.string() }) }),
	videoController.getUserVideos,
);

// User pending uploads
router.get("/pending", auth(), videoController.getUserPendingJobs);

// Routes for transcoder service
router.get("/jobs/next", transcoderAuth, videoController.getNextJob);

router.post("/jobs/complete", transcoderAuth, videoController.completeJob);

router.post("/jobs/fail", transcoderAuth, videoController.failJob);

export default router;
