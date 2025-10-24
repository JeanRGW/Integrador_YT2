import { AnyPgColumn, pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";
import users from "./users";
import videos from "./videos";
import { relations } from "drizzle-orm";

const typeEnum = pgEnum("like_type", ["like", "dislike"]);

export const videoLikes = pgTable("video_likes", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references((): AnyPgColumn => users.id),
	videoId: uuid("video_id")
		.notNull()
		.references((): AnyPgColumn => videos.id),
	type: typeEnum("type").notNull(),
});

export const videoLikesRelations = relations(videoLikes, ({ one }) => ({
	user: one(users, {
		fields: [videoLikes.userId],
		references: [users.id],
	}),
	video: one(videos, {
		fields: [videoLikes.videoId],
		references: [videos.id],
	}),
}));

export default videoLikes;
