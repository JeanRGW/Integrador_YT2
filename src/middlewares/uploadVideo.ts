import multer, { FileFilterCallback } from "multer";
import path from "path";
import AppError from "src/lib/AppError";
import { Request } from "express";

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/videos");
	},
	filename: (req, file, cb) => {
		const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, unique + path.extname(file.originalname));
	},
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
	if (file.mimetype.startsWith("video/")) {
		cb(null, true);
	} else {
		cb(new AppError("Only video files are allowed", 422));
	}
};

export const uploadVideo = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 1000 * 1024 * 1024, // 1 GB
	},
});
