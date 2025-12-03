import {
	S3Client,
	GetObjectCommand,
	HeadBucketCommand,
	CreateBucketCommand,
	HeadObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const {
	S3_ENDPOINT,
	S3_REGION,
	S3_ACCESS_KEY,
	S3_SECRET_KEY,
	S3_UPLOADS_BUCKET,
	S3_VIDEOS_BUCKET,
	S3_IMAGES_BUCKET,
} = process.env;

if (!S3_ENDPOINT) throw new Error("S3_ENDPOINT is not defined on environment.");
if (!S3_UPLOADS_BUCKET) throw new Error("S3_UPLOADS_BUCKET is not defined on environment.");
if (!S3_VIDEOS_BUCKET) throw new Error("S3_VIDEOS_BUCKET is not defined on environment.");
if (!S3_IMAGES_BUCKET) throw new Error("S3_IMAGES_BUCKET is not defined on environment.");
if (!S3_ACCESS_KEY || !S3_SECRET_KEY)
	throw new Error("S3_ACCESS_KEY/S3_SECRET_KEY not defined on environment.");

export const s3 = new S3Client({
	region: S3_REGION || "us-east-1",
	endpoint: S3_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: S3_ACCESS_KEY!,
		secretAccessKey: S3_SECRET_KEY!,
	},
});

export const uploadsBucket = S3_UPLOADS_BUCKET!;
export const videosBucket = S3_VIDEOS_BUCKET!;
export const imagesBucket = S3_IMAGES_BUCKET!;

export const ensureBuckets = async () => {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: uploadsBucket }));
	} catch {
		await s3.send(new CreateBucketCommand({ Bucket: uploadsBucket }));
	}
	try {
		await s3.send(new HeadBucketCommand({ Bucket: videosBucket }));
	} catch {
		await s3.send(new CreateBucketCommand({ Bucket: videosBucket }));
	}
	try {
		await s3.send(new HeadBucketCommand({ Bucket: imagesBucket }));
	} catch {
		await s3.send(new CreateBucketCommand({ Bucket: imagesBucket, ACL: "public-read" }));
	}
};

export const getVideoSignedUrl = async (key: string, expiresInSeconds = 900) => {
	const cmd = new GetObjectCommand({ Bucket: videosBucket, Key: key });
	return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
};

export const objectExists = async (bucket: string, key: string) => {
	try {
		await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
		return true;
	} catch (err: any) {
		if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
		throw err;
	}
};

export const getPresignedPostForUploads = async (
	key: string,
	maxBytes = 2000 * 1024 * 1024,
	contentType?: string,
	expiresSeconds = 900,
) => {
	// Conditions: max size and optional content type enforcement
	const conditions: any[] = [["content-length-range", 0, maxBytes]];
	if (contentType) conditions.push(["eq", "$Content-Type", contentType]);

	const presigned = await createPresignedPost(s3, {
		Bucket: uploadsBucket,
		Key: key,
		Conditions: conditions,
		Expires: expiresSeconds,
	});

	// presigned.fields + url to be used by client multipart form upload
	return presigned;
};

export const deleteObject = async (bucket: string, key: string) => {
	await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};
