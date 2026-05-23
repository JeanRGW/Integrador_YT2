import z from "zod";

export const initiateVideo = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	visibility: z.enum(["hidden", "link-only", "public"]).default("public"),
	filename: z.string().min(1),
	contentType: z.string().min(1),
});
export type InitiateVideo = z.infer<typeof initiateVideo>;

export const completeVideo = z.object({
	key: z.string().min(1),
	title: z.string().min(1).optional(),
	description: z.string().min(1).optional(),
	visibility: z.enum(["hidden", "link-only", "public"]).optional(),
});
export type CompleteVideo = z.infer<typeof completeVideo>;

export const updateVideo = z
	.object({
		title: z.string().min(1).optional(),
		description: z.string().min(1).optional(),
		visibility: z.enum(["hidden", "link-only", "public"]).optional(),
	})
	.strict();
export type UpdateVideo = z.infer<typeof updateVideo>;

export const searchVideos = z.object({
	q: z.string().optional(),
	uploaderName: z.string().optional(),
	minLength: z.coerce.number().int().min(0).optional(),
	maxLength: z.coerce.number().int().min(0).optional(),
	sortBy: z.enum(["date", "likes", "length", "title"]).optional().default("date"),
	sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
	page: z.coerce.number().int().min(1).optional().default(1),
	pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type SearchVideos = z.infer<typeof searchVideos>;
