import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is not set.");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
await pool.end();
