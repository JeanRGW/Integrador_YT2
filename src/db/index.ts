import 'dotenv/config';
import {drizzle} from "drizzle-orm/node-postgres"
import * as schema from "./schema"

const {DATABASE_URL} = process.env; 
if(!DATABASE_URL)
    throw new Error("DATABASE_URL is not defined on environment.")

export const db = drizzle(DATABASE_URL, {
    schema,
})

export default db;
