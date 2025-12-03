import { Router } from "express";
import * as likeController from "../controllers/like.controller";
import { validate } from "src/middlewares/validate";
import { toggleLike, videoIdParam } from "src/schemas/likeSchemas";
import { auth } from "src/middlewares/auth";

const router = Router();

// Toggle like/dislike on a video
router.post(
	"/:videoId",
	auth(),
	validate({ bodySchema: toggleLike, paramsSchema: videoIdParam }),
	likeController.toggleLike,
);

// Get current user's like status for a video
router.get(
	"/:videoId/status",
	auth(),
	validate({ paramsSchema: videoIdParam }),
	likeController.getUserLikeStatus,
);

// Get like/dislike counts for a video (public endpoint)
router.get(
	"/:videoId/counts",
	auth(true),
	validate({ paramsSchema: videoIdParam }),
	likeController.getVideoLikeCounts,
);

// Remove like/dislike from a video
router.delete(
	"/:videoId",
	auth(),
	validate({ paramsSchema: videoIdParam }),
	likeController.removeLike,
);

export default router;
