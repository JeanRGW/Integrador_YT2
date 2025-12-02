import { Request, Response, NextFunction } from "express";

export function transcoderAuth(req: Request, res: Response, next: NextFunction) {
	if (!process.env.TRANSCODER_SECRET) {
		// Fail fast if the secret is not configured
		return res
			.status(500)
			.json({ message: "Server misconfiguration: TRANSCODER_SECRET is not set" });
	}
	const secret = req.header("X-Transcoder-Secret");

	if (!secret || secret !== process.env.TRANSCODER_SECRET) {
		return res.status(401).json({ message: "Unauthorized" });
	}
	next();
}
