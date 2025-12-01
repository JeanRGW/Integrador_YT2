import z, { file } from "zod";

export const createVideo = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	visibility: z.enum(["hidden", "link-only", "public"]).default("public"),
});
export type CreateVideo = z.infer<typeof createVideo>;

// Presigned upload: initiate with only metadata and optional client hints
export const initiateVideo = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	visibility: z.enum(["hidden", "link-only", "public"]).default("public"),
	filename: z.string().min(1),
	contentType: z.string().min(1),
});
export type InitiateVideo = z.infer<typeof initiateVideo>;

// Presigned upload: complete with key and optional override metadata
export const completeVideo = z.object({
	key: z.string().min(1),
	title: z.string().min(1).optional(),
	description: z.string().min(1).optional(),
	visibility: z.enum(["hidden", "link-only", "public"]).optional(),
	videoLength: z.number().int().min(0).optional(),
});
export type CompleteVideo = z.infer<typeof completeVideo>;

export const updateVideo = z
	.object({
		title: z.string().min(1).optional(),
		description: z.string().min(1).optional(),
		visibility: z.enum(["hidden", "link-only", "public"]).optional(),
		videoLength: z.number().min(1).optional(),
	})
	.strict();
export type UpdateVideo = z.infer<typeof updateVideo>;
