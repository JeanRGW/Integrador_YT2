import z from "zod";

export const createUser = z.object({
    password: z.string().min(8),
    name: z.string().min(1),
    email: z.email().transform((x) => x.toLowerCase())
})
export type CreateUser = z.infer<typeof createUser>

export const updateUser = createUser.extend({
    oldPassword: z.string(),
}).partial();
export type UpdateUser = z.infer<typeof updateUser>