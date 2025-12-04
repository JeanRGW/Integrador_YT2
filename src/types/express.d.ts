export type UserJWT = {
	id: string;
	role: "user" | "admin";
};

declare global {
	namespace Express {
		interface Request {
			user?: UserJWT;
		}
	}
}

export {};
