import multer from "multer";

const storage = multer.memoryStorage();

export const uploadPhoto = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			cb(new Error("Only image uploads are allowed"));
			return;
		}
		cb(null, true);
	},
});

export default uploadPhoto;
