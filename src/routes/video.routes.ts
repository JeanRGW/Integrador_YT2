import { Router } from "express";
import * as videoController from "../controllers/video.controller";
import { validate } from "src/middlewares/validate";
import { updateVideo, initiateVideo, completeVideo, searchVideos } from "src/schemas/videoSchemas";
import { auth } from "src/middlewares/auth";
import { transcoderAuth } from "src/middlewares/transcoderAuth";
import z from "zod";

const router = Router();

router.get("/", auth(true), validate({ querySchema: searchVideos }), videoController.searchVideos);

router.post(
	"/initiate",
	auth(),
	validate({ bodySchema: initiateVideo }),
	videoController.initiateUpload,
);

router.post(
	"/complete",
	auth(),
	validate({ bodySchema: completeVideo }),
	videoController.completeUpload,
);

router.get(
	"/:id",
	auth(true),
	validate({
		paramsSchema: z.object({
			id: z.uuid(),
		}),
	}),
	videoController.getVideo,
);

router.put(
	"/:id",
	auth(),
	validate({ bodySchema: updateVideo, paramsSchema: z.object({ id: z.uuid() }) }),
	videoController.updateVideo,
);

router.delete(
	"/:id",
	auth(),
	validate({ paramsSchema: z.object({ id: z.uuid() }) }),
	videoController.deleteVideo,
);

router.get(
	"/:id/stream",
	auth(true),
	validate({ paramsSchema: z.object({ id: z.uuid() }) }),
	videoController.streamVideo,
);

router.get(
	"/user/:userId",
	auth(true),
	validate({ paramsSchema: z.object({ userId: z.uuid() }) }),
	videoController.getUserVideos,
);

router.get("/pending", auth(), videoController.getUserPendingJobs);

// Rotas para o transcoder
router.get("/jobs/next", transcoderAuth, videoController.getNextJob);

router.post("/jobs/complete", transcoderAuth, videoController.completeJob);

router.post("/jobs/fail", transcoderAuth, videoController.failJob);

export default router;
