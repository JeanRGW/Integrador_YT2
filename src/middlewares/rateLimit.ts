import rateLimit from "express-rate-limit";

export const globalRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
	standardHeaders: true,
	legacyHeaders: false,
	message: { code: 429, msg: "Too many requests, please try again later." },
});

export const signInRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 15,
	standardHeaders: true,
	legacyHeaders: false,
	message: { code: 429, msg: "Too many sign-in attempts, please try again later." },
});

export const uploadRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { code: 429, msg: "Too many upload attempts, please try again later." },
});
