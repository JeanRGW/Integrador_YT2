import { relations } from "drizzle-orm";
import { AnyPgColumn, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import users from "./users";
import { visibilityEnum } from "./videos";

export const pendingStatusEnum = pgEnum("pending_status", [
	"initiated",
	"uploaded",
	"processing",
	"done",
	"failed",
]);

export const pendingUploads = pgTable("pending_uploads", {
	id: serial("id").primaryKey().notNull(),
	userId: uuid("user_id")
		.notNull()
		.references((): AnyPgColumn => users.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
	key: text("key").notNull(),
	filename: text("filename"),
	contentType: text("content_type"),
	title: text("title"),
	description: text("description"),
	visibility: visibilityEnum("visibility").default("public"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
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
