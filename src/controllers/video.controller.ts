import { Request, Response, NextFunction } from "express";
import * as videoService from "../services/video.services";
import AppError from "src/lib/AppError";
import { getVideoStreamUrl, listUserVideos } from "src/services/video.services";
import { getPresignedPost, objectExists } from "src/lib/s3";

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

export const getUserVideos = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const videos = await listUserVideos(req.params.userId);
		return res.json(videos);
	} catch (err) {
		next(err);
	}
};

export const streamVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { url } = await getVideoStreamUrl(req.params.id);
		return res.json({ url });
	} catch (err) {
		next(err);
	}
};

export const initiateUpload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { filename, contentType } = req.body as any;

		const ext = filename && filename.includes(".") ? `.${filename.split(".").pop()}` : "";
		const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const key = `videos/${userId}/${unique}${ext}`;

		const presigned = await getPresignedPost(key, 2000 * 1024 * 1024, contentType, 900);

		return res.status(200).json({ key, upload: presigned });
	} catch (err) {
		next(err);
	}
};

export const completeUpload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { key, title, description, visibility, videoLength } = req.body as any;

		if (!key) throw new AppError("Missing key", 400);

		const exists = await objectExists(key);
		if (!exists) throw new AppError("Uploaded file not found", 400);

		const video = await videoService.createVideoFromUpload(userId, key, {
			title,
			description,
			visibility,
			videoLength,
		});

		return res.status(201).json(video);
	} catch (err) {
		next(err);
	}
};
