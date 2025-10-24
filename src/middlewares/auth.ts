import { Request, Response, NextFunction } from "express";
import { decodeToken } from "src/lib/jwt";

export const auth = (req: Request, res: Response, next: NextFunction) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ message: "Missing or invalid Authorization header" });
		}

		const token = authHeader.split(" ")[1];
		const userId = decodeToken(token);

		req.user = { id: userId };
		next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
};
