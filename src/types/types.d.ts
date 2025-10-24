export type ValidationSchema = {
	querySchema?: StrictZodObject;
	bodySchema?: StrictZodObject;
	paramsSchema?: StrictZodObject;
	headerSchema?: StrictZodObject;
};
