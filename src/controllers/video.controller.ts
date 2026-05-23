import { Request, Response, NextFunction } from "express";
import * as videoService from "../services/video.services";
import AppError from "src/lib/AppError";
import { getPresignedPostForUploads, objectExists, uploadsBucket, deleteObject } from "src/lib/s3";
import db from "@db/index";
import { randomUUID } from "node:crypto";
import { pendingUploads, videos } from "@db/schema";
import { eq, and, gte } from "drizzle-orm";
import { SearchVideos } from "src/schemas/videoSchemas";
import { MAX_VIDEO_UPLOAD_SIZE, MIN_VIDEO_UPLOAD_INTERVAL } from "src/lib/constants";

export const searchVideos = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const requesterId = req.user?.id;
		const filters = req.query as unknown as SearchVideos;
		const result = await videoService.searchVideos(filters);
		return res.json(result);
	} catch (err) {
		next(err);
	}
};

export const initiateUpload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.user!.id;
		const { filename, contentType, title, description, visibility } = req.body as any;

		const maxPending = 5;
		const pendingCount = (
			await db.query.pendingUploads.findMany({
				where: (t, { eq, and }) =>
					and(
						eq(t.userId, userId),
						eq(t.status, "initiated"),
						gte(t.createdAt, new Date(Date.now() - MIN_VIDEO_UPLOAD_INTERVAL)),
					),
			})
		).length;

		if (pendingCount >= maxPending)
			return res.status(429).json({ message: "Too many concurrent uploads" });

		const uuid = randomUUID();
		const ext = filename && filename.includes(".") ? `.${filename.split(".").pop()}` : "";
		const key = `uploads/${userId}/${uuid}${ext}`;
		const presigned = await getPresignedPostForUploads(
			key,
			MAX_VIDEO_UPLOAD_SIZE,
			contentType,
			MIN_VIDEO_UPLOAD_INTERVAL / 1000 + 300,
		);

		await db.insert(pendingUploads).values({
			userId,
			key,
			contentType,
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

		const [pending] = await db
			.update(pendingUploads)
			.set({ status: "uploaded" })
			.where(and(eq(pendingUploads.key, key), eq(pendingUploads.userId, userId)))
			.returning();

		if (!pending) throw new AppError("Pending upload not found", 404);

		return res.status(202).json({ message: "Upload received; processing queued", key });
	} catch (err) {
		next(err);
	}
};

export const getVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const requester = req.user;
		const video = await videoService.getVideo(req.params.id, requester);
		return res.json(video);
	} catch (err) {
		next(err);
	}
};

export const updateVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const video = await videoService.updateVideo(req.params.id, req.user!, req.body);

		return res.json(video);
	} catch (err) {
		next(err);
	}
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await videoService.deleteVideo(req.params.id, req.user!);
		return res.json(result);
	} catch (err) {
		next(err);
	}
};

export const streamVideo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const requester = req.user;
		const { url } = await videoService.getVideoStreamUrl(req.params.id, requester);
		return res.json({ url });
	} catch (err) {
		next(err);
	}
};

export const getUserVideos = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const requester = req.user;
		const page = req.query.page ? Number(req.query.page) : undefined;
		const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
		const videos = await videoService.listUserVideosForRequester(req.params.userId, requester, {
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
		const [item] = await db
			.update(pendingUploads)
			.set({ status: "processing" })
			.where(
				and(
					eq(
						pendingUploads.id,
						db
							.select({ id: pendingUploads.id })
							.from(pendingUploads)
							.where(eq(pendingUploads.status, "uploaded"))
							.limit(1),
					),
					eq(pendingUploads.status, "uploaded"),
				),
			)
			.returning();

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

		const video = await db.transaction(async (tx) => {
			const [pending] = await tx.select().from(pendingUploads).where(eq(pendingUploads.key, key));
			if (!pending) throw new AppError("Pending upload not found", 404);

			const videoLength = meta?.durationSec ? Math.round(meta.durationSec) : 0;
			const title = pending.title || pending.filename || "Untitled Video";
			const description = pending.description || "";

			const [inserted] = await tx
				.insert(videos)
				.values({
					userId: pending.userId,
					title,
					description,
					visibility: pending.visibility || "public",
					videoLength,
					video: finalKey,
				})
				.returning();

			await tx
				.update(pendingUploads)
				.set({ status: "done" })
				.where(eq(pendingUploads.key, key));

			return inserted;
		});

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
