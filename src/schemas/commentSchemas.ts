import z from "zod";

export const createComment = z.object({
	text: z.string().min(1).max(5000),
});
export type CreateComment = z.infer<typeof createComment>;

export const updateComment = z.object({
	text: z.string().min(1).max(5000),
});
export type UpdateComment = z.infer<typeof updateComment>;

export const videoIdParam = z.object({
	videoId: z.string().uuid(),
});
export type VideoIdParam = z.infer<typeof videoIdParam>;

export const commentIdParam = z.object({
	commentId: z.string().uuid(),
});
export type CommentIdParam = z.infer<typeof commentIdParam>;

export const getCommentsQuery = z.object({
	page: z.coerce.number().int().min(1).optional().default(1),
	pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
	sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type GetCommentsQuery = z.infer<typeof getCommentsQuery>;
