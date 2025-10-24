import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = async(err: any, req: Request, res: Response, next: NextFunction) => {
    if(err instanceof ZodError){
        return res.status(400).json({
            code: 400,
            msg: err.message
        });
    }

    if(err instanceof AppError){
        return res.status(err.code).json({
            code: err.code,
            msg: err.message
        })
    }

    return res.status(500).json({
        code: 500,
        msg: "Internal server error."
    })
}