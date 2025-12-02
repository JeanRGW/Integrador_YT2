import db from "@db/index";
import { videos } from "@db/schema/videos";
import { eq } from "drizzle-orm";
import AppError from "src/lib/AppError";
import { CreateVideo, InitiateVideo, UpdateVideo } from "src/schemas/videoSchemas";
import { getVideoSignedUrl } from "src/lib/s3";

// export const createVideo = async (userId: string, data: CreateVideo, filePath: string) => {
// 	if (!filePath) throw new AppError("Video file is required", 400);

// 	const [video] = await db
// 		.insert(videos)
// 		.values({
// 			userId,
// 			title: data.title,
// 			description: data.description,
// 			visibility: data.visibility,
// 			videoLength: data.videoLength,
// 			video: filePath,
// 		})
// 		.returning();

// 	return video;
// };

export const getVideo = async (id: string) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);

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

export const getVideoStreamUrl = async (id: string) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, id),
	});

	if (!video) throw new AppError("Video not found", 404);

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
