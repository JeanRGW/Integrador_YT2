import jwt, { JwtPayload } from "jsonwebtoken";

const {JWT_SECRET} = process.env;
if(!JWT_SECRET)
    throw new Error("JWT_SECRET not defined on environment.")

export const signToken = (uuid: string): string => jwt.sign({}, JWT_SECRET, {subject: uuid});

/**
 * 
 * @param token 
 * @returns uuid of user
 * @throws error on invalid token
 */

export const decodeToken = (token: string): string => (jwt.verify(token, JWT_SECRET) as JwtPayload).sub!
