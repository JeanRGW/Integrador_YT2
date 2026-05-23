import "dotenv/config";
import { validateEnv } from "./lib/env";

validateEnv();

import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { ensureBuckets } from "./lib/s3";
import apiRouter from "./routes/index";
import { runCleanupPending } from "./jobs/cleanupPending";
import { globalRateLimit } from "./middlewares/rateLimit";

(async () => {
	try {
		await ensureBuckets();
		console.log("S3 buckets ready");
	} catch (e) {
		console.error("Failed to ensure S3 buckets", e);
	}
})();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));

app.use("/api", globalRateLimit, apiRouter);

app.use(errorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);

	runCleanupPending().catch((e) => console.error("Initial cleanup job failed:", e));
	const ONE_HOUR_MS = 1 * 60 * 60 * 1000;
	setInterval(() => {
		runCleanupPending().catch((e) => console.error("Scheduled cleanup job failed:", e));
	}, ONE_HOUR_MS);
});
