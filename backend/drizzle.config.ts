import { defineConfig } from "drizzle-kit";

// Migrations use the direct (unpooled) connection per Neon's guidance --
// PgBouncer's transaction pooling mode doesn't support the session-level
// commands schema migrations sometimes need.
const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is not set.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
  strict: true,
});
