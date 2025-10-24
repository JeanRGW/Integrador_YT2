import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.services";

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await userService.createUser(req.body);
		return res.status(201).json(user);
	} catch (err) {
		next(err);
	}
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await userService.getUser(req.user!.id);
		return res.json(user);
	} catch (err) {
		next(err);
	}
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await userService.updateUser(req.user!.id, req.body);
		return res.json(user);
	} catch (err) {
		next(err);
	}
};
