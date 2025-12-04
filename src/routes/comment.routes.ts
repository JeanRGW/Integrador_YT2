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

router.post(
	"/:videoId",
	auth(),
	validate({ bodySchema: createComment, paramsSchema: videoIdParam }),
	commentController.createComment,
);

router.get(
	"/:videoId",
	auth(true),
	validate({ paramsSchema: videoIdParam, querySchema: getCommentsQuery }),
	commentController.getVideoComments,
);

router.get(
	"/:videoId/count",
	auth(true),
	validate({ paramsSchema: videoIdParam }),
	commentController.getCommentCount,
);

router.get(
	"/comment/:commentId",
	auth(true),
	validate({ paramsSchema: commentIdParam }),
	commentController.getComment,
);

router.put(
	"/comment/:commentId",
	auth(),
	validate({ bodySchema: updateComment, paramsSchema: commentIdParam }),
	commentController.updateComment,
);

router.delete(
	"/comment/:commentId",
	auth(),
	validate({ paramsSchema: commentIdParam }),
	commentController.deleteComment,
);

export default router;
