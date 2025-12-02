import { Request, Response, NextFunction } from "express";
import * as videoService from "../services/video.services";
import AppError from "src/lib/AppError";
import { getVideoStreamUrl } from "src/services/video.services";
import {
	getPresignedPostForUploads,
	objectExists,
	uploadsBucket,
	videosBucket,
	deleteObject,
} from "src/lib/s3";
import db from "@db/index";
import { randomUUID } from "node:crypto";
import { pendingUploads } from "@db/schema";
import { eq } from "drizzle-orm";

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
		const requesterId = req.user?.id;
		const page = req.query.page ? Number(req.query.page) : undefined;
		const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
		const videos = await videoService.listUserVideosForRequester(req.params.userId, requesterId, {
			page,
			pageSize,
		});
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
		const { filename, contentType, title } = req.body as any;

		const maxPending = 2;
		const pendingCount = (
			await db.query.pendingUploads.findMany({
				where: (t, { eq, or, and }) => and(eq(t.userId, userId), eq(t.status, "initiated")),
			})
		).length;

		if (pendingCount >= maxPending)
			return res.status(429).json({ message: "Too many concurrent uploads" });

		const uuid = randomUUID();
		const ext = filename && filename.includes(".") ? `.${filename.split(".").pop()}` : "";
		const key = `uploads/${userId}/${uuid}${ext}`;
		const presigned = await getPresignedPostForUploads(key, 2000 * 1024 * 1024, contentType, 900);

		const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
		await db.insert(pendingUploads).values({
			userId,
			key,
			contentType,
			expiresAt,
			filename,
		});

		return res.status(200).json({ key, upload: presigned });
	} catch (err) {
		next(err);
	}
};

export const completeUpload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { key } = req.body as any;

		if (!key) throw new AppError("Missing key", 400);

		const exists = await objectExists(uploadsBucket, key);
		if (!exists) throw new AppError("Uploaded file not found", 400);

		// Mark pending upload as uploaded; transcoder will process and finalize
		const [pending] = await db
			.update(pendingUploads)
			.set({ status: "uploaded" })
			.where(eq(pendingUploads.key, key))
			.returning();

		if (!pending) throw new AppError("Pending upload not found", 404);

		return res.status(202).json({ message: "Upload received; processing queued", key });
	} catch (err) {
		next(err);
	}
};

export const processedWebhook = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Called by transcoder when final video is ready in videos bucket
		const { pendingKey, finalKey, meta } = req.body as any;
		if (!pendingKey || !finalKey) throw new AppError("Missing keys", 400);

		const existsFinal = await objectExists(videosBucket, finalKey);
		if (!existsFinal) throw new AppError("Finalized video not found", 400);

		// Ensure pending exists and was uploaded
		const pending = await db.query.pendingUploads.findFirst({
			where: (t, { eq }) => eq(t.key, pendingKey),
		});
		if (!pending) throw new AppError("Pending upload not found", 404);

		// Create video record pointing to finalized key
		const video = await videoService.createVideoFromUpload(pending.userId, finalKey, meta ?? {});

		// Mark pending as done and cleanup raw upload
		await db
			.update(pendingUploads)
			.set({ status: "done" })
			.where(eq(pendingUploads.key, pendingKey));

		try {
			await deleteObject(uploadsBucket, pendingKey);
		} catch (err) {
			console.warn("Failed to delete upload object:", err);
		}

		return res.status(201).json({ video });
	} catch (err) {
		next(err);
	}
};

export const getPendingJobs = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const limit = req.query.limit ? Number(req.query.limit) : 3;
		const items = await db.query.pendingUploads.findMany({
			where: (t, { eq }) => eq(t.status, "uploaded"),
			limit,
		});
		return res.json(items);
	} catch (err) {
		next(err);
	}
};

export const claimJob = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { key } = req.body as any;
		if (!key) throw new AppError("Missing key", 400);
		const [updated] = await db
			.update(pendingUploads)
			.set({ status: "processing" })
			.where(eq(pendingUploads.key, key))
			.returning();
		if (!updated) throw new AppError("Pending upload not found", 404);
		return res.json({ ok: true });
	} catch (err) {
		next(err);
	}
};

export const markJobFailed = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { key, reason } = req.body as any;
		if (!key) throw new AppError("Missing key", 400);
		const [updated] = await db
			.update(pendingUploads)
			.set({ status: "failed" })
			.where(eq(pendingUploads.key, key))
			.returning();
		if (!updated) throw new AppError("Pending upload not found", 404);
		return res.json({ ok: true, reason });
	} catch (err) {
		next(err);
	}
};

export const getUserPendingJobs = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const items = await db.query.pendingUploads.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
		});
		return res.json(items);
	} catch (err) {
		next(err);
	}
};
