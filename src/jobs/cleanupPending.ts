import "dotenv/config";
import db from "@db/index";
import { pendingUploads } from "@db/schema";
import { lt, eq } from "drizzle-orm";
import { uploadsBucket, objectExists, deleteObject } from "src/lib/s3";

// Cleanup not done/failed uploads older than 24 hours from createdAt
// Removes S3 object if present and deletes DB rows
export async function runCleanupPending() {
	const now = new Date();
	const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	// Fetch candidates older than cutoff
	const candidates = await db.query.pendingUploads.findMany({
		where: (t, { lt, and, notInArray }) =>
			and(lt(t.createdAt, cutoff), notInArray(t.status, ["done", "failed"])),
	});

	if (!candidates.length) {
		console.log("No pending uploads older than 24h.");
		return;
	}

	console.log(`Found ${candidates.length} pending uploads older than 24h. Cleaning...`);

	for (const item of candidates) {
		try {
			if (item.key) {
				const exists = await objectExists(uploadsBucket, item.key);
				if (exists) {
					await deleteObject(uploadsBucket, item.key);
					console.log(`Deleted S3 object: ${item.key}`);
				}
			}
			await db.delete(pendingUploads).where(eq(pendingUploads.id, item.id));
		} catch (err) {
			console.error(`Failed cleaning pending upload id=${item.id}:`, err);
		}
	}

	console.log("Cleanup finished.");
}
