import db from "@db/index";
import { videos } from "@db/schema/videos";
import { eq } from "drizzle-orm";
import AppError from "src/lib/AppError";
import { CreateVideo, UpdateVideo } from "src/schemas/videoSchemas";

export const createVideo = async (userId: string, data: CreateVideo, filePath: string) => {
	if (!filePath) throw new AppError("Video file is required", 400);

	const [video] = await db
		.insert(videos)
		.values({
			userId,
			title: data.title,
			description: data.description,
			visibility: data.visibility,
			videoLength: data.videoLength,
			video: filePath,
		})
		.returning();

	return video;
};

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
