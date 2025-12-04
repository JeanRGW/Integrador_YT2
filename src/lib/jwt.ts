import jwt, { JwtPayload } from "jsonwebtoken";

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) throw new Error("JWT_SECRET not defined on environment.");

export const signToken = (uuid: string, role: string): string =>
	jwt.sign({ role }, JWT_SECRET, { subject: uuid });

export const decodeToken = (
	token: string,
): {
	id: string;
	role: "user" | "admin";
} => {
	const decoded = jwt.verify(token, JWT_SECRET);

	return {
		id: (decoded as JwtPayload).sub!,
		role: (decoded as JwtPayload).role!,
	};
};
