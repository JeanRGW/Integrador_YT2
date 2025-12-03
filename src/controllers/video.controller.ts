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
import { pendingUploads, videos } from "@db/schema";
import { eq } from "drizzle-orm";
import { SearchVideos } from "src/schemas/videoSchemas";

export const searchVideos = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const requesterId = req.user?.id;
		const filters = req.query as unknown as SearchVideos;
		const result = await videoService.searchVideos(filters, requesterId);
		return res.json(result);
	} catch (err) {
		next(err);
	}
};

export const initiateUpload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { filename, contentType, title, description, visibility } = req.body as any;

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
			title: title || filename || "Untitled Video",
			description: description || "",
			visibility: visibility || "public",
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

export const getVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const requesterId = req.user?.id;
		const video = await videoService.getVideo(req.params.id, requesterId);
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

export const streamVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const requesterId = req.user?.id;
		const { url } = await getVideoStreamUrl(req.params.id, requesterId);
		return res.json({ url });
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

export const getNextJob = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const item = await db.query.pendingUploads.findFirst({
			where: (t, { eq }) => eq(t.status, "uploaded"),
		});

		item &&
			(await db
				.update(pendingUploads)
				.set({ status: "processing" })
				.where(eq(pendingUploads.key, item.key)));

		if (!item) return res.status(204).end();
		return res.json(item);
	} catch (err) {
		next(err);
	}
};

export const completeJob = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { key, finalKey, meta } = req.body as any;
		if (!key || !finalKey) throw new AppError("Missing key or finalKey", 400);

		// Find the pending upload
		const [pending] = await db.select().from(pendingUploads).where(eq(pendingUploads.key, key));

		if (!pending) throw new AppError("Pending upload not found", 404);

		// Create the video record using stored metadata
		const videoLength = meta?.durationSec ? Math.round(meta.durationSec) : 0;
		const title = pending.title || pending.filename || "Untitled Video";
		const description = pending.description || "";
		const visibility = pending.visibility || "public";

		const [video] = await db
			.insert(videos)
			.values({
				userId: pending.userId,
				title,
				description,
				visibility,
				videoLength,
				video: finalKey,
			})
			.returning();

		// Mark pending upload as done
		await db.update(pendingUploads).set({ status: "done" }).where(eq(pendingUploads.key, key));

		// Optional: Delete the raw upload from S3 uploadsBucket
		try {
			await deleteObject(uploadsBucket, key);
		} catch (err) {
			console.error("Failed to delete raw upload:", err);
		}

		return res.json({ ok: true, videoId: video.id });
	} catch (err) {
		next(err);
	}
};

export const failJob = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { key, reason } = req.body as any;
		if (!key) throw new AppError("Missing key", 400);
		const [updated] = await db
			.update(pendingUploads)
			.set({ status: "failed" })
			.where(eq(pendingUploads.key, key))
			.returning();
		if (!updated) throw new AppError("Pending upload not found", 404);

		// Optional: Clean up the raw upload from S3
		try {
			await deleteObject(uploadsBucket, key);
		} catch (err) {
			console.error("Failed to delete failed upload:", err);
		}

		console.error(`Job failed for key ${key}: ${reason || "unknown reason"}`);
		return res.json({ ok: true, reason });
	} catch (err) {
		next(err);
	}
};
