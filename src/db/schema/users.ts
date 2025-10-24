import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { videos } from "./videos";
import { relations } from "drizzle-orm";
import { videoComments } from "./videoComments";
import { videoLikes } from "./videoLikes";

export const users = pgTable("users", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(), // Normalizar minusculas antes de inserir
	photoUrl: text("photo_url"),
	pwHash: text("password_hash").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
	videos: many(videos),
	comments: many(videoComments),
	likes: many(videoLikes),
}));

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;

export default users;
