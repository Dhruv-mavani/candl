import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { waitlist } from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface JoinBody {
  email?: string;
  name?: string;
  twitter?: string;
  walletAddress?: string;
  message?: string;
}

function requireAdmin(request: { headers: Record<string, unknown> }): boolean {
  const secret = process.env.ADMIN_SECRET;
  return !!secret && request.headers["x-admin-secret"] === secret;
}

export function registerWaitlistRoutes(app: FastifyInstance, db: Db) {
  // POST /waitlist -- public signup while the site is gated behind waitlist mode.
  app.post<{ Body: JoinBody }>("/api/v1/waitlist", async (request, reply) => {
    const { email, name, twitter, walletAddress, message } = request.body ?? {};

    if (!email || !EMAIL_RE.test(email)) {
      return reply.code(400).send({ error: "A valid email is required" });
    }
    if (!name || !name.trim()) {
      return reply.code(400).send({ error: "Name is required" });
    }

    const [existing] = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1);
    if (existing) {
      return reply.send({ status: "already-joined" });
    }

    await db.insert(waitlist).values({
      email,
      name: name.trim(),
      twitter: twitter?.trim() || null,
      walletAddress: walletAddress?.trim() || null,
      message: message?.trim() || null,
    });

    return reply.code(201).send({ status: "joined" });
  });

  // GET /admin/waitlist -- founder-only view of signups, gated by ADMIN_SECRET.
  app.get("/api/v1/admin/waitlist", async (request, reply) => {
    if (!requireAdmin(request)) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const rows = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
    return reply.send(rows);
  });
}
