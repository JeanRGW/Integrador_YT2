import db from "@db/index";
import { users } from "@db/schema";
import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import AppError from "src/lib/AppError";
import { CreateUser, UpdateUser } from "src/schemas/userSchemas";

export const createUser = async (userInsert: CreateUser) => {
	const { email, name, password } = userInsert;

	const emailExists = await db.query.users.findFirst({
		where(fields, operators) {
			return operators.eq(fields.email, email);
		},
	});

	if (emailExists) throw new AppError("Email already in use", 422);

	const pwHash = await hash(password, 8);

	const [user] = await db.insert(users).values({ email, name, pwHash }).returning();

	return user;
};

export const getUser = async (uuid: string) => {
	const user = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, uuid) });

	if (!user) throw new AppError("User not found.", 404);

	return user;
};

export const updateUser = async (uuid: string, userUpdate: UpdateUser) => {
	const { email, name, password, oldPassword } = userUpdate;

	const user = await db.query.users.findFirst({
		where: (t, { eq }) => eq(t.id, uuid),
	});

	if (!user) {
		throw new AppError("User not found", 404);
	}

	let pwHash = undefined;

	if (password) {
		if (!oldPassword) throw new AppError("Must include oldPassword on password update");

		if (!(await compare(oldPassword, user.pwHash)))
			throw new AppError("Old password doesnt match.");

		pwHash = await hash(password, 8);
	}

	if (email) {
		const emailExists = await db.query.users.findFirst({
			where(fields, { and, eq, ne }) {
				return and(eq(fields.email, email), ne(fields.id, uuid));
			},
		});

		if (emailExists) throw new AppError("Email already in use.");
	}

	const data: Partial<typeof user> = {};
	if (email) data.email = email;
	if (name) data.name = name;
	if (pwHash) data.pwHash = pwHash;

	const [updatedUser] = await db.update(users).set(data).where(eq(users.id, uuid)).returning();

	return updatedUser;
};
