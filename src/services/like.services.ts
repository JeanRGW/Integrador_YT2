import db from "@db/index";
import { videoLikes } from "@db/schema/videoLikes";
import { videos } from "@db/schema/videos";
import { eq, sql } from "drizzle-orm";
import AppError from "src/lib/AppError";
export const toggleLike = async (videoId: string, userId: string, type: "like" | "dislike") => {
	const isLike = type === "like";

	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, videoId),
	});

	if (!video) throw new AppError("Video not found", 404);

	const existing = await db.query.videoLikes.findFirst({
		where: (t, { eq, and }) => and(eq(t.videoId, videoId), eq(t.userId, userId)),
	});

	if (existing) {
		if (existing.type === type) {
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

export const getUserLikeStatus = async (videoId: string, userId: string) => {
	const like = await db.query.videoLikes.findFirst({
		where: (t, { eq, and }) => and(eq(t.videoId, videoId), eq(t.userId, userId)),
	});

	return like ? { hasLiked: true, type: like.type } : { hasLiked: false, type: null };
};

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
