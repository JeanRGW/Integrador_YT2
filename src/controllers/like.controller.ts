import { Request, Response, NextFunction } from "express";
import * as likeService from "../services/like.services";

export const toggleLike = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { videoId } = req.params;
		const { type } = req.body;

		const result = await likeService.toggleLike(videoId, userId, type);
		return res.json(result);
	} catch (err) {
		next(err);
	}
};

export const getUserLikeStatus = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { videoId } = req.params;

		const status = await likeService.getUserLikeStatus(videoId, userId);
		return res.json(status);
	} catch (err) {
		next(err);
	}
};

export const getVideoLikeCounts = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { videoId } = req.params;

		const counts = await likeService.getVideoLikeCounts(videoId);
		return res.json(counts);
	} catch (err) {
		next(err);
	}
};

export const removeLike = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { videoId } = req.params;

		const result = await likeService.removeLike(videoId, userId);
		return res.json(result);
	} catch (err) {
		next(err);
	}
};
