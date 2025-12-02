import "dotenv/config";
import { validateEnv } from "./lib/env";

validateEnv();

import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { ensureBuckets } from "./lib/s3";
import apiRouter from "./routes/index";

(async () => {
	try {
		await ensureBuckets();
		console.log("S3 buckets ready");
	} catch (e) {
		console.error("Failed to ensure S3 buckets", e);
	}
})();

const app = express();

// Enable CORS for browser clients
app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
