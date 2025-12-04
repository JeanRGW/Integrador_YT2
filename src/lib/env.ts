type RequiredEnv = {
	key: string;
	optional?: boolean;
};

const requiredEnvVars: RequiredEnv[] = [
	{ key: "DATABASE_URL" },
	{ key: "JWT_SECRET" },
	{ key: "S3_ENDPOINT" },
	{ key: "S3_ACCESS_KEY" },
	{ key: "S3_SECRET_KEY" },
	{ key: "S3_UPLOADS_BUCKET" },
	{ key: "S3_VIDEOS_BUCKET" },
	{ key: "TRANSCODER_SECRET" },
];

export function validateEnv() {
	const missing = requiredEnvVars.filter((e) => !e.optional).filter((e) => !process.env[e.key]);

	if (missing.length > 0) {
		const list = missing.map((m) => m.key).join(", ");
		throw new Error(`Missing required environment variables: ${list}`);
	}
}
