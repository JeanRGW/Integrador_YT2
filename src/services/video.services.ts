import db from "@db/index";
import { videos } from "@db/schema/videos";
import { eq, and, or, ilike, gte, lte, asc, desc, sql } from "drizzle-orm";
import AppError from "src/lib/AppError";
import { InitiateVideo, UpdateVideo, SearchVideos } from "src/schemas/videoSchemas";
import { getVideoSignedUrl, deleteObject, videosBucket } from "src/lib/s3";
import { users } from "@db/schema";
import { UserJWT } from "src/types/express";

export const getVideo = async (id: string, requester?: UserJWT) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
		with: {
			owner: {
				columns: {
					id: true,
					name: true,
					photoUrl: true,
				},
			},
		},
	});

	if (!video) throw new AppError("Video not found", 404);

	if (video.visibility === "hidden") {
		if (!requester || (video.userId !== requester.id && requester.role !== "admin")) {
			throw new AppError("Video not found", 404);
		}
	}

	return video;
};

export const updateVideo = async (id: string, user: UserJWT, data: UpdateVideo) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);
	if (video.userId !== user.id && user.role !== "admin")
		throw new AppError("You do not own this video", 403);

	const [updated] = await db.update(videos).set(data).where(eq(videos.id, id)).returning();

	return updated;
};

export const deleteVideo = async (id: string, user: UserJWT) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);
	if (video.userId !== user.id && user.role !== "admin")
		throw new AppError("You do not own this video", 403);

	await db.delete(videos).where(eq(videos.id, id));
	try {
		await deleteObject(videosBucket, video.video);
	} catch (err) {
		console.error("Failed to delete video from S3:", err);
	}

	return { message: "Video deleted successfully" };
};

export const listUserVideos = async (userId: string) => {
	const videosList = await db.query.videos.findMany({
		where: (t, { eq }) => eq(t.userId, userId),
		with: {
			owner: {
				columns: {
					id: true,
					name: true,
					photoUrl: true,
				},
			},
		},
	});
	return videosList;
};

export const listUserVideosForRequester = async (
	targetUserId: string,
	requester?: UserJWT,
	options?: { page?: number; pageSize?: number },
) => {
	const page = options?.page && options.page > 0 ? options.page : 1;
	const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : 10;
	const offset = (page - 1) * pageSize;

	if (requester && (requester.id === targetUserId || requester.role === "admin")) {
		return db.query.videos.findMany({
			where: (t, { eq }) => eq(t.userId, targetUserId),
			limit: pageSize,
			offset,
			with: {
				owner: {
					columns: {
						id: true,
						name: true,
						photoUrl: true,
					},
				},
			},
		});
	}
	return db.query.videos.findMany({
		where: (t, { eq, and }) => and(eq(t.userId, targetUserId), eq(t.visibility, "public")),
		limit: pageSize,
		offset,
		with: {
			owner: {
				columns: {
					id: true,
					name: true,
					photoUrl: true,
				},
			},
		},
	});
};

export const getVideoStreamUrl = async (id: string, requester?: UserJWT) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);

	if (video.visibility === "hidden") {
		if (!requester || (video.userId !== requester.id && requester.role !== "admin")) {
			throw new AppError("Video not found", 404);
		}
	}

	const keyOrUrl = video.video;
	const isHttp = /^https?:\/\//i.test(keyOrUrl);
	if (isHttp) return { url: keyOrUrl };

	const signedUrl = await getVideoSignedUrl(keyOrUrl);
	return { url: signedUrl };
};

export const initiateVideoUpload = async (userId: string, data: InitiateVideo) => {};

export const createVideoFromUpload = async (
	userId: string,
	key: string,
	meta: {
		title?: string;
		description?: string;
		visibility?: "hidden" | "link-only" | "public";
		videoLength?: number;
	},
) => {
	const [video] = await db
		.insert(videos)
		.values({
			userId,
			title: meta.title ?? "Untitled",
			description: meta.description ?? "",
			visibility: meta.visibility ?? "public",
			videoLength: meta.videoLength ?? 0,
			video: key,
		})
		.returning();

	return video;
};

export const searchVideos = async (filters: SearchVideos) => {
	const {
		q,
		uploaderName,
		minLength,
		maxLength,
		sortBy = "date",
		sortOrder = "desc",
		page = 1,
		pageSize = 20,
	} = filters;

	const offset = (page - 1) * pageSize;

	const conditions = [];
	conditions.push(eq(videos.visibility, "public"));
	if (q) {
		const searchPattern = `%${q}%`;
		conditions.push(
			or(ilike(videos.title, searchPattern), ilike(videos.description, searchPattern)),
		);
	}

	if (minLength !== undefined) {
		conditions.push(gte(videos.videoLength, minLength));
	}
	if (maxLength !== undefined) {
		conditions.push(lte(videos.videoLength, maxLength));
	}

	let query = db
		.select({
			id: videos.id,
			userId: videos.userId,
			title: videos.title,
			description: videos.description,
			visibility: videos.visibility,
			likeCount: videos.likeCount,
			dislikeCount: videos.dislikeCount,
			date: videos.date,
			videoLength: videos.videoLength,
			video: videos.video,
			uploaderName: users.name,
			uploaderPhotoUrl: users.photoUrl,
		})
		.from(videos)
		.innerJoin(users, eq(videos.userId, users.id));

	if (uploaderName) {
		conditions.push(ilike(users.name, `%${uploaderName}%`));
	}

	if (conditions.length > 0) {
		query = query.where(and(...conditions)) as any;
	}

	const sortColumn = {
		date: videos.date,
		likes: videos.likeCount,
		length: videos.videoLength,
		title: videos.title,
	}[sortBy];

	const sortFn = sortOrder === "asc" ? asc : desc;
	query = query.orderBy(sortFn(sortColumn)) as any;

	query = query.limit(pageSize).offset(offset) as any;

	const results = await query;

	const countConditions = conditions.length > 0 ? and(...conditions) : undefined;
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(videos)
		.innerJoin(users, eq(videos.userId, users.id))
		.where(countConditions);

	return {
		videos: results,
		pagination: {
			page,
			pageSize,
			totalCount: count,
			totalPages: Math.ceil(count / pageSize),
		},
	};
};
