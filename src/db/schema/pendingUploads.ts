import { relations } from "drizzle-orm";
import { pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import users from "./users";

export const pendingStatusEnum = pgEnum("pending_status", [
	"initiated",
	"uploaded",
	"processing",
	"done",
	"failed",
]);

export const pendingUploads = pgTable("pending_uploads", {
	id: serial("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	key: text("key").notNull(),
	filename: text("filename"),
	contentType: text("content_type"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	expiresAt: timestamp("expires_at").notNull(),
	status: pendingStatusEnum("status").notNull().default("initiated"),
});

export const pendingUploadRelations = relations(pendingUploads, ({ one }) => ({
	user: one(users, {
		fields: [pendingUploads.userId],
		references: [users.id],
	}),
}));

export type PendingUploadInsert = typeof pendingUploads.$inferInsert;
export type PendingUploadSelect = typeof pendingUploads.$inferSelect;

export default pendingUploads;
