import { Request, Response, NextFunction } from "express";
import { ValidationSchema } from "src/types/types";
import z from "zod";

export const validate =
	({ querySchema, bodySchema, paramsSchema, headerSchema }: ValidationSchema) =>
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			querySchema ? querySchema.parse(req.query) : null;

			bodySchema ? bodySchema.parse(req.body) : null;

			paramsSchema ? paramsSchema.parse(req.params) : null;

			headerSchema ? headerSchema.parse(req.headers) : null;

			return next();
		} catch (err) {
			next(err);
		}
	};
