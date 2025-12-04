import { ZodType } from "zod";

export type ValidationSchema = {
	querySchema?: ZodType;
	bodySchema?: ZodType;
	paramsSchema?: ZodType;
	headerSchema?: ZodType;
};
