import { AnyPgColumn, date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import users from "./users";
import videos from "./videos";
import { relations } from "drizzle-orm";

export const videoComments = pgTable("video_comments", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references((): AnyPgColumn => users.id),
	videoId: uuid("video_id")
		.notNull()
		.references((): AnyPgColumn => videos.id),
	text: text("text").notNull(),
	date: date("date").notNull().defaultNow(),
});

export const videoCommentsRelations = relations(videoComments, ({ one }) => ({
	user: one(users, {
		fields: [videoComments.userId],
		references: [users.id],
	}),
	video: one(videos, {
		fields: [videoComments.videoId],
		references: [videos.id],
	}),
}));

export default videoComments;
