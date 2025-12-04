import { Router } from "express";
import * as likeController from "../controllers/like.controller";
import { validate } from "src/middlewares/validate";
import { toggleLike, videoIdParam } from "src/schemas/likeSchemas";
import { auth } from "src/middlewares/auth";

const router = Router();

router.post(
	"/:videoId",
	auth(),
	validate({ bodySchema: toggleLike, paramsSchema: videoIdParam }),
	likeController.toggleLike,
);

router.get(
	"/:videoId/status",
	auth(),
	validate({ paramsSchema: videoIdParam }),
	likeController.getUserLikeStatus,
);

router.get(
	"/:videoId/counts",
	auth(true),
	validate({ paramsSchema: videoIdParam }),
	likeController.getVideoLikeCounts,
);

router.delete(
	"/:videoId",
	auth(),
	validate({ paramsSchema: videoIdParam }),
	likeController.removeLike,
);

export default router;
