import { Request, Response, NextFunction } from "express";
import * as commentService from "../services/comment.services";

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { videoId } = req.params;
		const { text } = req.body;

		const comment = await commentService.createComment(videoId, userId, text);
		return res.status(201).json(comment);
	} catch (err) {
		next(err);
	}
};

export const getVideoComments = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { videoId } = req.params;
		const { page, pageSize, sortOrder } = req.query as any;

		const comments = await commentService.getVideoComments(videoId, {
			page: page ? parseInt(page) : undefined,
			pageSize: pageSize ? parseInt(pageSize) : undefined,
			sortOrder: sortOrder as "asc" | "desc" | undefined,
		});

		return res.json(comments);
	} catch (err) {
		next(err);
	}
};

export const getComment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { commentId } = req.params;

		const comment = await commentService.getComment(commentId);
		return res.json(comment);
	} catch (err) {
		next(err);
	}
};

export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { commentId } = req.params;
		const { text } = req.body;

		const comment = await commentService.updateComment(commentId, userId, text);
		return res.json(comment);
	} catch (err) {
		next(err);
	}
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user!;
		const { commentId } = req.params;

		const result = await commentService.deleteComment(commentId, user);
		return res.json(result);
	} catch (err) {
		next(err);
	}
};

export const getCommentCount = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { videoId } = req.params;

		const result = await commentService.getCommentCount(videoId);
		return res.json(result);
	} catch (err) {
		next(err);
	}
};
