import "dotenv/config";
import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { ensureBucket } from "./lib/s3";
import apiRouter from "./routes/index";

(async () => {
	try {
		await ensureBucket();
		console.log("S3 bucket ready");
	} catch (e) {
		console.error("Failed to ensure S3 bucket", e);
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
