# Copilot Instructions for Integrador_YT2

These instructions help AI coding agents quickly understand this codebase and follow its established patterns.

## Architecture Overview

- **Stack:** TypeScript + Express (v5), Drizzle ORM (PostgreSQL), Zod, Multer, JSON Web Tokens.
- **Data Layer:** Drizzle models under `src/db/schema/` (`users`, `videos`, `videoComments`, `videoLikes`). Export aggregator at `src/db/schema/index.ts`. Drizzle connection in `src/db/index.ts` using `DATABASE_URL`.
- **Business Layer:** Services encapsulate DB operations and domain logic:
  - `src/services/user.services.ts` for user CRUD and auth token creation.
  - `src/services/video.services.ts` for video CRUD and ownership checks.
- **HTTP Layer:** Controllers call services and handle request/response:
  - `src/controllers/*.ts`.
  - Routes in `src/routes/*.ts` compose middlewares and map to controllers.
- **Middlewares:**
  - `auth.ts` attaches `req.user` via `Authorization: Bearer <jwt>` using `src/lib/jwt.ts`.
  - `validate.ts` runs Zod schemas from `src/schemas/*` on `req.body`, `req.query`, etc.
  - `uploadVideo.ts` uses Multer to store uploads in `uploads/videos` with size/type checks.
  - `errorHandler.ts` normalizes `ZodError` and `AppError` to HTTP responses.
- **Errors:** Use `src/lib/AppError.ts` for domain errors; do not throw raw strings.
- **Types:** `src/types/express.d.ts` augments `Express.Request.user`, and `src/types/types.d.ts` defines `ValidationSchema`.

## Project Conventions

- **Import aliases:** Use `@db/*` for DB modules per `tsconfig.json` (`paths`). Prefer `@db/index` and `@db/schema/*` over relative imports.
- **Validation:** Every route with input should wrap controller with `validate({ bodySchema | querySchema | paramsSchema })` using Zod schemas in `src/schemas/*`.
- **Auth:** Protected endpoints include `auth` before `validate`. Controllers assume `req.user!.id` is present when protected.
- **Errors:** Throw `new AppError(message, httpCode)` from services or controllers; let `errorHandler` format responses.
- **Ownership checks:** Mutations on videos enforce `video.userId === req.user!.id`.
- **Uploads:** Multer writes videos to `uploads/videos`. Expose static serving via Express (see note below).

## Environment & Setup

- **Required env:** `DATABASE_URL`, `JWT_SECRET`. The app will throw early if they are missing (`src/db/index.ts`, `src/lib/jwt.ts`).
- **Drizzle config:** `drizzle.config.ts` drives migrations; snapshot SQL exists under `drizzle/`.
- **Run dev:**
  ```cmd
  npm install
  npm run dev
  ```
- **Format:** `npm run format` (Prettier) targets `src/**/*`.

## Express App Assembly

- The file `src/index.ts` is currently minimal. When wiring the app, follow these patterns:
  - Mount routers: `app.use("/users", userRouter)` and `app.use("/videos", videoRouter)` from `src/routes/*`.
  - Static serving for uploaded videos: `app.use("/videos", express.static("uploads/videos"))` (commented example is in `src/index.ts`).
  - Global error handler last: `app.use(errorHandler)`.
  - Include JSON parsing and any CORS as needed.

## Drizzle Usage Patterns

- **Query helpers:** Prefer `db.query.<table>.findFirst({ where: (t, { eq, and, ne }) => ... })` for reads.
- **Insert/Update:** Use `db.insert(table).values(...).returning()` and `db.update(table).set(...).where(eq(table.id, ...)).returning()`.
- **Enums:** See `pgEnum` usage in `videos.ts` (`visibility`) and `videoLikes.ts` (`like_type`).

## JWT Patterns

- **Sign:** `signToken(user.id)` returns a compact JWT with `sub` set.
- **Decode:** `decodeToken(token)` returns the `userId` (throws on invalid/expired).
- **Header:** Use `Authorization: Bearer <token>`; `auth` middleware expects this shape.

## Route Composition Examples

- **Create user:**
  - Route: `POST /users` → `validate({ bodySchema: createUser })` → `user.controller.createUser`.
  - Service ensures unique email, hashes with bcrypt, returns created user.
- **Upload video:**
  - Route: `POST /videos` → `auth` → `uploadVideo.single("video")` → `validate({ bodySchema: createVideo })` → `video.controller.createVideo`.
  - Service persists file path in `videos.video` and metadata.

## Common Tasks

- **Add a new endpoint:**
  - Create Zod schema in `src/schemas/*`.
  - Implement service logic in `src/services/*` using Drizzle.
  - Write controller thin wrapper calling the service.
  - Register route with `validate` and optionally `auth` and other middlewares.
- **Add a new table:** Define `src/db/schema/<table>.ts`, export from `schema/index.ts`, then generate migration with Drizzle.

## Migrations (Drizzle Kit)

- With `DATABASE_URL` set, you can generate and push migrations (adjust commands if using different flow):
  ```cmd
  npx drizzle-kit generate:pg
  npx drizzle-kit push:pg
  ```

## Troubleshooting

- **Missing `req.user`:** Ensure `auth` middleware is included and header is `Bearer`.
- **Validation errors:** `ZodError` returns 400 via `errorHandler`.
- **File upload failures:** Verify `uploads/videos` exists and app has static serving configured.
- **Path import errors:** Confirm TS paths (`@db/*`) and `tsx` runner support; use Node resolution compatible import paths.

If any section feels off or incomplete (e.g., exact dev server bootstrap, migration workflow specifics), tell me what you want clarified, and I’ll refine this file.
