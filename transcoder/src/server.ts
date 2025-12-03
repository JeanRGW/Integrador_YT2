import "dotenv/config";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import { createWriteStream, promises as fs } from "fs";
import path from "path";

const {
	S3_ENDPOINT,
	S3_REGION = "us-east-1",
	S3_ACCESS_KEY,
	S3_SECRET_KEY,
	S3_UPLOADS_BUCKET,
	S3_VIDEOS_BUCKET,
	API_BASE_URL = "http://localhost:3000/api",
	TRANSCODER_SECRET,
} = process.env;

if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY || !S3_UPLOADS_BUCKET || !S3_VIDEOS_BUCKET) {
	throw new Error("Missing required S3 env variables");
}
if (!TRANSCODER_SECRET) throw new Error("TRANSCODER_SECRET is required");

const s3 = new S3Client({
	region: S3_REGION,
	endpoint: S3_ENDPOINT,
	forcePathStyle: true,
	credentials: { accessKeyId: S3_ACCESS_KEY!, secretAccessKey: S3_SECRET_KEY! },
});

async function fetchNextJob() {
	const url = `${API_BASE_URL}/videos/jobs/next`;
	const res = await fetch(url, {
		method: "GET",
		headers: { "X-Transcoder-Secret": TRANSCODER_SECRET! },
	});
	if (res.status === 204) return null; // No jobs available
	if (!res.ok) throw new Error(`Failed to fetch next job: ${res.status}`);
	return res.json();
}

async function downloadRaw(key: string) {
	const tmpDir = path.join(process.cwd(), "tmp");
	await fs.mkdir(tmpDir, { recursive: true });
	const outPath = path.join(tmpDir, path.basename(key) || "input.bin");

	const resp = await s3.send(new GetObjectCommand({ Bucket: S3_UPLOADS_BUCKET!, Key: key }));
	const stream = resp.Body as NodeJS.ReadableStream;
	await new Promise<void>((resolve, reject) => {
		const file = createWriteStream(outPath);
		stream.pipe(file);
		stream.on("error", reject);
		file.on("finish", () => resolve());
		file.on("error", reject);
	});
	return outPath;
}

async function transcode(inputPath: string) {
	const outputPath = inputPath.replace(/\.[^.]+$/, "") + ".transcoded.mp4";
	const args = [
		"-y",
		"-i",
		inputPath,
		"-c:v",
		"libx264",
		"-preset",
		"fast",
		"-crf",
		"28",
		"-c:a",
		"aac",
		"-b:a",
		"128k",
		"-movflags",
		"+faststart",
		outputPath,
	];
	await new Promise<void>((resolve, reject) => {
		const proc = spawn("ffmpeg", args, { stdio: "inherit" });
		proc.on("exit", (code) =>
			code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
		);
		proc.on("error", reject);
	});
	return outputPath;
}

async function probeMeta(filePath: string) {
	const args = ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", filePath];
	const stdoutChunks: Buffer[] = [];
	await new Promise<void>((resolve, reject) => {
		const proc = spawn("ffprobe", args);
		proc.stdout.on("data", (d) => stdoutChunks.push(Buffer.from(d)));
		proc.stderr.on("data", () => {});
		proc.on("exit", (code) =>
			code === 0 ? resolve() : reject(new Error(`ffprobe exited ${code}`)),
		);
		proc.on("error", reject);
	});
	try {
		const json = JSON.parse(Buffer.concat(stdoutChunks).toString("utf8"));
		const videoStream = (json.streams || []).find((s: any) => s.codec_type === "video");
		const width = videoStream?.width ?? null;
		const height = videoStream?.height ?? null;
		const durationSec = json.format?.duration ? Number(json.format.duration) : null;
		return { durationSec, width, height };
	} catch (err) {
		console.error("Failed to parse ffprobe output:", err);
		return { durationSec: null, width: null, height: null };
	}
}

async function uploadFinal(userId: string, outputPath: string) {
	const base = path.basename(outputPath);
	const key = `videos/${userId}/${Date.now()}-${base}`;
	const file = await fs.readFile(outputPath);
	await s3.send(
		new PutObjectCommand({
			Bucket: S3_VIDEOS_BUCKET!,
			Key: key,
			Body: file,
			ContentType: "video/mp4",
		}),
	);
	return key;
}

async function completeJob(key: string, finalKey: string, meta: any) {
	const body = { key, finalKey, meta };
	const res = await fetch(`${API_BASE_URL}/videos/jobs/complete`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Transcoder-Secret": TRANSCODER_SECRET! },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Complete job failed: ${res.status}`);
	return res.json();
}

async function failJob(key: string, reason: string) {
	const body = { key, reason };
	const res = await fetch(`${API_BASE_URL}/videos/jobs/fail`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Transcoder-Secret": TRANSCODER_SECRET! },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Fail job failed: ${res.status}`);
	return res.json();
}

async function processJob(job: any) {
	console.log("Processing job", job.key);
	try {
		const input = await downloadRaw(job.key);
		const output = await transcode(input);
		const finalKey = await uploadFinal(job.userId, output);
		const meta = await probeMeta(output);
		await completeJob(job.key, finalKey, meta);
		try {
			await fs.unlink(input);
		} catch (err) {
			console.error(`Failed to delete input file ${input}:`, err);
		}
		try {
			await fs.unlink(output);
		} catch (err) {
			console.error(`Failed to delete output file ${output}:`, err);
		}
		console.log("Finished job", job.key);
	} catch (err) {
		console.error("Job processing error", err);
		await failJob(job.key, err instanceof Error ? err.message : String(err));
		throw err;
	}
}

async function loop() {
	while (true) {
		try {
			const job = await fetchNextJob();
			if (job) {
				await processJob(job);
			} else {
				// No jobs available, wait before polling again
				await new Promise((r) => setTimeout(r, 5000));
			}
		} catch (err) {
			console.error("Loop error", err);
			await new Promise((r) => setTimeout(r, 5000));
		}
	}
}

loop().catch((err) => {
	console.error("Fatal transcoder error", err);
	process.exit(1);
});
