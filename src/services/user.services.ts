import db from "@db/index";
import { users } from "@db/schema";
import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import AppError from "src/lib/AppError";
import { CreateUser, SignInUser, UpdateUser } from "src/schemas/userSchemas";
import { signToken } from "src/lib/jwt";
import { deleteObject, s3, imagesBucket } from "src/lib/s3";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

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

export const signUser = async (data: SignInUser) => {
	const { email, password } = data;

	const user = await db.query.users.findFirst({
		where: (t, { eq }) => eq(t.email, email),
	});

	if (!user) throw new AppError("Invalid credentials", 401);

	const passwordMatch = await compare(password, user.pwHash);

	if (!passwordMatch) throw new AppError("Invalid credentials", 401);

	return { user, token: signToken(user.id, user.role) };
};

export const removePhoto = async (userId: string) => {
	const current = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, userId) });
	if (!current) throw new AppError("User not found", 404);
	if (!current.photoUrl) return { message: "No photo to remove" };

	try {
		await deleteObject(imagesBucket, current.photoUrl);
	} catch {}

	await db.update(users).set({ photoUrl: null }).where(eq(users.id, userId));

	return { message: "Photo removed" };
};

export const uploadPhotoDirect = async (
	userId: string,
	file: { buffer: Buffer; originalname: string; mimetype: string },
) => {
	const uuid = randomUUID();
	const ext =
		file.originalname && file.originalname.includes(".")
			? `.${file.originalname.split(".").pop()}`
			: "";
	const key = `photos/${userId}/${uuid}${ext}`;

	await s3.send(
		new PutObjectCommand({
			Bucket: imagesBucket,
			Key: key,
			Body: file.buffer,
			ContentType: file.mimetype,
			ACL: "public-read",
		}),
	);

	const current = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, userId) });
	if (!current) throw new AppError("User not found", 404);
	if (current.photoUrl && current.photoUrl !== key) {
		try {
			await deleteObject(imagesBucket, current.photoUrl);
		} catch {}
	}

	const [updated] = await db
		.update(users)
		.set({ photoUrl: key })
		.where(eq(users.id, userId))
		.returning();

	return updated;
};
