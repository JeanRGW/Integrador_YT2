import { Request, Response, NextFunction } from "express";
import { decodeToken } from "src/lib/jwt";

/**
 * Authentication middleware that validates JWT tokens.
 * @param optional - If true, allows requests to proceed without valid auth. If false (default), requires valid auth.
 */
export const auth = (optional: boolean = false) => {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				if (optional) {
					return next();
				}
				return res.status(401).json({ message: "Missing or invalid Authorization header" });
			}

			const token = authHeader.split(" ")[1];
			const userId = decodeToken(token);

			req.user = { id: userId };
			next();
		} catch (error) {
			if (optional) {
				return next();
			}
			return res.status(401).json({ message: "Invalid or expired token" });
		}
	};
};
