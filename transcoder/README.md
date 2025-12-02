# Transcoder Worker

A lightweight polling-based transcoding worker for the Integrador_YT2 project. It:

- Polls the API for pending upload jobs (`status = uploaded`).
- Downloads raw video objects from the uploads S3 bucket.
- Transcodes them to MP4 (H.264/AAC) using FFmpeg.
- Uploads the result to the videos S3 bucket.
- Calls the API webhook `/api/videos/processed` with a shared secret to finalize.

## Requirements

- FFmpeg installed and on PATH.
- Node.js 18+.
- Running API instance exposing `/api/videos/jobs/pending` and `/api/videos/processed`.
- Environment variables configured.

## Environment Variables

Place in a `.env` file (or supply via process manager):

```
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_UPLOADS_BUCKET=uploads
S3_VIDEOS_BUCKET=videos
API_BASE_URL=http://localhost:3000/api
TRANSCODER_SECRET=super-secret-token
```

## Install & Run

```cmd
cd transcoder
npm install
npm run dev
```

## How It Works

1. GET `/videos/jobs/pending?limit=2` -> list pending upload records (status `uploaded`).
2. For each job: download object from uploads bucket.
3. FFmpeg transcodes to MP4.
4. Upload to videos bucket.
5. POST `/videos/processed` with `{ pendingKey, finalKey, meta, userId }` and header `X-Transcoder-Secret`.
6. API creates video record, marks pending as done, deletes raw upload object.

## Extending

- Use `ffprobe` to extract duration & resolution and send real metadata.
- Replace polling with a queue (Redis + bullmq) for efficiency and retry logic.
- Add multipart upload support for very large files.
- Implement concurrency controls and worker scaling.

## Troubleshooting

- Ensure buckets exist (API calls `ensureBuckets()` on startup).
- AccessDenied: check credentials & bucket names.
- ffmpeg not found: confirm it's installed and in PATH.
- Empty job list: verify you called `/videos/complete` after client upload.
