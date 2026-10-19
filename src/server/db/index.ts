import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// Reuse the connection across HMR reloads in dev so we don't exhaust the pool.
const client =
  globalForDb.pg ??
  postgres(process.env.DATABASE_URL ?? "postgres://actline:actline@localhost:5432/actline", { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
