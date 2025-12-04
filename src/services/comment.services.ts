import db from "@db/index";
import { videoComments } from "@db/schema/videoComments";
import { videos } from "@db/schema/videos";
import { users } from "@db/schema/users";
import { eq, and, desc, asc } from "drizzle-orm";
import AppError from "src/lib/AppError";
import { UserJWT } from "src/types/express";

export const createComment = async (videoId: string, userId: string, text: string) => {
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, videoId),
	});

	if (!video) throw new AppError("Video not found", 404);

	const [comment] = await db
		.insert(videoComments)
		.values({
			videoId,
			userId,
			text,
		})
		.returning();

	const commentWithUser = await db.query.videoComments.findFirst({
		where: (t, { eq }) => eq(t.id, comment.id),
		with: {
			user: {
				columns: {
					id: true,
					name: true,
					photoUrl: true,
				},
			},
		},
	});

	return commentWithUser;
};

export const getVideoComments = async (
	videoId: string,
	options?: { page?: number; pageSize?: number; sortOrder?: "asc" | "desc" },
) => {
	const page = options?.page && options.page > 0 ? options.page : 1;
	const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : 20;
	const sortOrder = options?.sortOrder || "desc";
	const offset = (page - 1) * pageSize;
	const video = await db.query.videos.findFirst({
		where: (t, { eq }) => eq(t.id, videoId),
	});

	if (!video) throw new AppError("Video not found", 404);
	const comments = await db.query.videoComments.findMany({
		where: (t, { eq }) => eq(t.videoId, videoId),
		with: {
			user: {
				columns: {
					id: true,
					name: true,
					photoUrl: true,
				},
			},
		},
		orderBy: sortOrder === "asc" ? [asc(videoComments.date)] : [desc(videoComments.date)],
		limit: pageSize,
		offset,
	});

	return comments;
};

export const getComment = async (commentId: string) => {
	const comment = await db.query.videoComments.findFirst({
		where: (t, { eq }) => eq(t.id, commentId),
		with: {
			user: {
				columns: {
					id: true,
					name: true,
					photoUrl: true,
				},
			},
		},
	});

	if (!comment) throw new AppError("Comment not found", 404);

	return comment;
};

export const updateComment = async (commentId: string, userId: string, text: string) => {
	const comment = await db.query.videoComments.findFirst({
		where: (t, { eq }) => eq(t.id, commentId),
	});

	if (!comment) throw new AppError("Comment not found", 404);
	if (comment.userId !== userId) throw new AppError("You do not own this comment", 403);
	const [updated] = await db
		.update(videoComments)
		.set({ text })
		.where(eq(videoComments.id, commentId))
		.returning();
	const commentWithUser = await db.query.videoComments.findFirst({
		where: (t, { eq }) => eq(t.id, updated.id),
		with: {
			user: {
				columns: {
					id: true,
					name: true,
					photoUrl: true,
				},
			},
		},
	});

	return commentWithUser;
};

export const deleteComment = async (commentId: string, user: UserJWT) => {
	const comment = await db.query.videoComments.findFirst({
		where: (t, { eq }) => eq(t.id, commentId),
	});

	if (!comment) throw new AppError("Comment not found", 404);
	if (comment.userId !== user.id && user.role !== "admin")
		throw new AppError("You do not own this comment", 403);
	await db.delete(videoComments).where(eq(videoComments.id, commentId));

	return { message: "Comment deleted successfully" };
};

export const getCommentCount = async (videoId: string) => {
	const comments = await db.query.videoComments.findMany({
		where: (t, { eq }) => eq(t.videoId, videoId),
	});

	return { count: comments.length };
};
