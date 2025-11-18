import { Request, Response, NextFunction } from "express";
import * as videoService from "../services/video.services";
import AppError from "src/lib/AppError";

export const createVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;

		const filePath = req.file?.path || null;

		if (!filePath) {
			throw new AppError("Video file is required", 422);
		}

		const video = await videoService.createVideo(userId, req.body, filePath);

		return res.status(201).json(video);
	} catch (err) {
		next(err);
	}
};

export const getVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const video = await videoService.getVideo(req.params.id);
		return res.json(video);
	} catch (err) {
		next(err);
	}
};

export const updateVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const video = await videoService.updateVideo(req.params.id, req.user!.id, req.body);

		return res.json(video);
	} catch (err) {
		next(err);
	}
};
