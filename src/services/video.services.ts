import db from "@db/index";
import { videos } from "@db/schema/videos";
import { eq, and, or, ilike, gte, lte, asc, desc, sql } from "drizzle-orm";
import AppError from "src/lib/AppError";
import { CreateVideo, InitiateVideo, UpdateVideo, SearchVideos } from "src/schemas/videoSchemas";
import { getVideoSignedUrl } from "src/lib/s3";
import { users } from "@db/schema";

/**
 * Get a video by ID with access control.
 * - Public videos are accessible to everyone.
 * - Link-only videos are accessible to everyone who has the link.
 * - Hidden videos are only accessible to the owner.
 */
export const getVideo = async (id: string, requesterId?: string) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);

	// Access control: hidden videos require ownership
	if (video.visibility === "hidden") {
		if (!requesterId || video.userId !== requesterId) {
			throw new AppError("Video not found", 404);
		}
	}

	return video;
};

export const updateVideo = async (id: string, userId: string, data: UpdateVideo) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);
	if (video.userId !== userId) throw new AppError("You do not own this video", 403);

	const [updated] = await db.update(videos).set(data).where(eq(videos.id, id)).returning();

	return updated;
};

export const listUserVideos = async (userId: string) => {
	const videosList = await db.query.videos.findMany({
		where: (t, { eq }) => eq(t.userId, userId),
	});
	return videosList;
};

/**
 * Lists videos for a given user, applying access control based on the requester.
 *
 * - If the requester is the owner (`requesterId === targetUserId`), all videos are returned.
 * - If the requester is not the owner (or unauthenticated), only videos with `visibility: "public"` are returned.
 *
 * @param targetUserId - The user whose videos are being listed.
 * @param requesterId - The ID of the user making the request, or undefined if unauthenticated.
 * @param options - Optional pagination options: `page` (1-based) and `pageSize`.
 * @returns A paginated list of videos visible to the requester.
 */
export const listUserVideosForRequester = async (
	targetUserId: string,
	requesterId: string | undefined,
	options?: { page?: number; pageSize?: number },
) => {
	const page = options?.page && options.page > 0 ? options.page : 1;
	const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : 10;
	const offset = (page - 1) * pageSize;

	if (requesterId && requesterId === targetUserId) {
		// Owner: sees all
		return db.query.videos.findMany({
			where: (t, { eq }) => eq(t.userId, targetUserId),
			limit: pageSize,
			offset,
		});
	}
	// Non-owner: filter by visibility (public only)
	return db.query.videos.findMany({
		where: (t, { eq, and }) => and(eq(t.userId, targetUserId), eq(t.visibility, "public")),
		limit: pageSize,
		offset,
	});
};

/**
 * Get a streaming URL for a video with access control.
 * - Public videos are accessible to everyone.
 * - Link-only videos are accessible to everyone who has the link.
 * - Hidden videos are only accessible to the owner.
 */
export const getVideoStreamUrl = async (id: string, requesterId?: string) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);

	// Access control: hidden videos require ownership
	if (video.visibility === "hidden") {
		if (!requesterId || video.userId !== requesterId) {
			throw new AppError("Video not found", 404);
		}
	}

	const keyOrUrl = video.video;
	// If storage saved full URL (e.g. `location`), return directly; if key, build signed URL
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

/**
 * Search and filter videos with pagination.
 * Supports:
 * - Text search on title/description
 * - Filter by uploader name
 * - Filter by video length range
 * - Sort by date, likes, length, or title
 * - Pagination
 *
 * Only returns public videos (and link-only for direct access).
 * Hidden videos are excluded from search results.
 */
export const searchVideos = async (filters: SearchVideos, requesterId?: string) => {
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

	// Build WHERE conditions
	const conditions = [];

	// Only show public in search
	conditions.push(eq(videos.visibility, "public"));

	// Text search on title and description
	if (q) {
		const searchPattern = `%${q}%`;
		conditions.push(
			or(ilike(videos.title, searchPattern), ilike(videos.description, searchPattern)),
		);
	}

	// Video length filters
	if (minLength !== undefined) {
		conditions.push(gte(videos.videoLength, minLength));
	}
	if (maxLength !== undefined) {
		conditions.push(lte(videos.videoLength, maxLength));
	}

	// Build the base query with join to users for uploader name filter
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
		})
		.from(videos)
		.innerJoin(users, eq(videos.userId, users.id));

	// Apply uploader name filter
	if (uploaderName) {
		conditions.push(ilike(users.name, `%${uploaderName}%`));
	}

	// Apply all conditions
	if (conditions.length > 0) {
		query = query.where(and(...conditions)) as any;
	}

	// Apply sorting
	const sortColumn = {
		date: videos.date,
		likes: videos.likeCount,
		length: videos.videoLength,
		title: videos.title,
	}[sortBy];

	const sortFn = sortOrder === "asc" ? asc : desc;
	query = query.orderBy(sortFn(sortColumn)) as any;

	// Apply pagination
	query = query.limit(pageSize).offset(offset) as any;

	const results = await query;

	// Get total count for pagination metadata
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
