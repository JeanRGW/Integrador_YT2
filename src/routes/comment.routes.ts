import { Router } from "express";
import * as commentController from "../controllers/comment.controller";
import { validate } from "src/middlewares/validate";
import {
	createComment,
	updateComment,
	videoIdParam,
	commentIdParam,
	getCommentsQuery,
} from "src/schemas/commentSchemas";
import { auth } from "src/middlewares/auth";

const router = Router();

// Create a comment on a video
router.post(
	"/:videoId",
	auth(),
	validate({ bodySchema: createComment, paramsSchema: videoIdParam }),
	commentController.createComment,
);

// Get all comments for a video (public endpoint with optional auth)
router.get(
	"/:videoId",
	auth(true),
	validate({ paramsSchema: videoIdParam, querySchema: getCommentsQuery }),
	commentController.getVideoComments,
);

// Get comment count for a video (public endpoint)
router.get(
	"/:videoId/count",
	auth(true),
	validate({ paramsSchema: videoIdParam }),
	commentController.getCommentCount,
);

// Get a single comment by ID (public endpoint)
router.get(
	"/comment/:commentId",
	auth(true),
	validate({ paramsSchema: commentIdParam }),
	commentController.getComment,
);

// Update a comment (only by owner)
router.put(
	"/comment/:commentId",
	auth(),
	validate({ bodySchema: updateComment, paramsSchema: commentIdParam }),
	commentController.updateComment,
);

// Delete a comment (only by owner)
router.delete(
	"/comment/:commentId",
	auth(),
	validate({ paramsSchema: commentIdParam }),
	commentController.deleteComment,
);

export default router;
