import z from "zod";

export const createVideo = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	visibility: z.enum(["hidden", "link-only", "public"]).default("public"),
	videoLength: z.number().min(1),
	// "video" é um campo de upload de arquivo, que não pode ser validado aqui
});
export type CreateVideo = z.infer<typeof createVideo>;

export const updateVideo = z
	.object({
		title: z.string().min(1).optional(),
		description: z.string().min(1).optional(),
		visibility: z.enum(["hidden", "link-only", "public"]).optional(),
		videoLength: z.number().min(1).optional(),
	})
	.strict();
export type UpdateVideo = z.infer<typeof updateVideo>;
