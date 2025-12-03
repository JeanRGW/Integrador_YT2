import db from "@db/index";
import { videoLikes } from "@db/schema/videoLikes";
import { videos } from "@db/schema/videos";
import { eq, and, sql } from "drizzle-orm";
import AppError from "src/lib/AppError";

/**
 * Toggle like/dislike on a video.
 * - If the user has already liked/disliked the video with the same type, remove it.
 * - If the user has liked/disliked with a different type, update it.
 * - If no existing like/dislike, create a new one.
 */
export const toggleLike = async (videoId: string, userId: string, type: "like" | "dislike") => {
	const isLike = type === "like";

	// First, check if video exists
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, videoId),
	});

	if (!video) throw new AppError("Video not found", 404);

	// Check if user already has a like/dislike on this video
	const existing = await db.query.videoLikes.findFirst({
		where: (t, { eq, and }) => and(eq(t.videoId, videoId), eq(t.userId, userId)),
	});

	if (existing) {
		if (existing.type === type) {
			// Same type: remove the like/dislike (toggle off)
			await db.delete(videoLikes).where(eq(videoLikes.id, existing.id));

			await db
				.update(videos)
				.set(
					isLike
						? { likeCount: sql`${videos.likeCount} - 1` }
						: { dislikeCount: sql`${videos.dislikeCount} - 1` },
				)
				.where(eq(videos.id, videoId));

			return { action: "removed", type };
		} else {
			// Different type: update to new type
			const [updated] = await db
				.update(videoLikes)
				.set({ type })
				.where(eq(videoLikes.id, existing.id))
				.returning();

			await db
				.update(videos)
				.set(
					isLike
						? {
								likeCount: sql`${videos.likeCount} + 1`,
								dislikeCount: sql`${videos.dislikeCount} - 1`,
							}
						: {
								likeCount: sql`${videos.likeCount} - 1`,
								dislikeCount: sql`${videos.dislikeCount} + 1`,
							},
				)
				.where(eq(videos.id, videoId));

			return { action: "updated", type: updated.type };
		}
	}

	// No existing like/dislike: create new one
	const [created] = await db
		.insert(videoLikes)
		.values({
			videoId,
			userId,
			type,
		})
		.returning();

	await db
		.update(videos)
		.set(
			isLike
				? { likeCount: sql`${videos.likeCount} + 1` }
				: { dislikeCount: sql`${videos.dislikeCount} + 1` },
		)
		.where(eq(videos.id, videoId));

	return { action: "created", type: created.type };
};

/**
 * Get the like/dislike status for a video by a specific user.
 */
export const getUserLikeStatus = async (videoId: string, userId: string) => {
	const like = await db.query.videoLikes.findFirst({
		where: (t, { eq, and }) => and(eq(t.videoId, videoId), eq(t.userId, userId)),
	});

	return like ? { hasLiked: true, type: like.type } : { hasLiked: false, type: null };
};

/**
 * Get like/dislike counts for a video, using count on database (more resource intensive, prefer to use values stored on video).
 */
export const getVideoLikeCounts = async (videoId: string) => {
	const result = await db
		.select({
			likes: sql<number>`count(case when ${videoLikes.type} = 'like' then 1 end)`,
			dislikes: sql<number>`count(case when ${videoLikes.type} = 'dislike' then 1 end)`,
		})
		.from(videoLikes)
		.where(eq(videoLikes.videoId, videoId));

	return {
		likes: Number(result[0]?.likes || 0),
		dislikes: Number(result[0]?.dislikes || 0),
	};
};

/**
 * Remove a like/dislike from a video.
 */
export const removeLike = async (videoId: string, userId: string) => {
	const existing = await db.query.videoLikes.findFirst({
		where: (t, { eq, and }) => and(eq(t.videoId, videoId), eq(t.userId, userId)),
	});

	if (!existing) throw new AppError("Like/dislike not found", 404);

	await db.delete(videoLikes).where(eq(videoLikes.id, existing.id));
	await db
		.update(videos)
		.set(
			existing.type === "like"
				? { likeCount: sql`${videos.likeCount} - 1` }
				: { dislikeCount: sql`${videos.dislikeCount} - 1` },
		)
		.where(eq(videos.id, videoId));

	return { message: "Like/dislike removed successfully" };
};
