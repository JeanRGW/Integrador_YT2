import { relations } from "drizzle-orm";
import { uuid, text, pgTable, AnyPgColumn, pgEnum, integer, date } from "drizzle-orm/pg-core";
import users from "./users";
import { videoComments } from "./videoComments";
import { videoLikes } from "./videoLikes";

export const visibilityEnum = pgEnum("visibility", ["hidden", "link-only", "public"]);

export const videos = pgTable("videos", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references((): AnyPgColumn => users.id),
	title: text("title").notNull(),
	description: text("description").notNull(),
	visibility: visibilityEnum("visibility").notNull().default("public"),
	likeCount: integer("like_count").notNull().default(0),
	dislikeCount: integer("dislike_count").notNull().default(0),
	date: date("date").notNull().defaultNow(),
	videoLength: integer("video_length").notNull(),
	video: text("video").notNull(),
});

export const videoRelations = relations(videos, ({ one, many }) => ({
	owner: one(users, {
		fields: [videos.userId],
		references: [users.id],
	}),
	comments: many(videoComments),
	likes: many(videoLikes),
}));

export default videos;
