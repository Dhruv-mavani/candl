import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

// Lazy singleton: avoids throwing at module-load time if DATABASE_URL isn't
// set yet (e.g. during a build step), and avoids wrapping the client in a
// Proxy, which breaks libraries that introspect the client's shape.
function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export { schema };
