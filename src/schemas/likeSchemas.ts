import z from "zod";

export const toggleLike = z.object({
	type: z.enum(["like", "dislike"]),
});
export type ToggleLike = z.infer<typeof toggleLike>;

export const videoIdParam = z.object({
	videoId: z.uuid(),
});
export type VideoIdParam = z.infer<typeof videoIdParam>;
