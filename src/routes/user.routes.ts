import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { validate } from "src/middlewares/validate";
import { createUser, updateUser, signInUser } from "src/schemas/userSchemas";
import { auth } from "src/middlewares/auth";

const router = Router();

router.post(
	"/",
	validate({
		bodySchema: createUser,
	}),
	userController.createUser,
);

router.get("/me", auth(), userController.getMe);

router.put(
	"/me",
	auth(),
	validate({
		bodySchema: updateUser,
	}),
	userController.updateMe,
);

router.post(
	"/signin",
	validate({
		bodySchema: signInUser,
	}),
	userController.signIn,
);

export default router;
