# Deploying the backend

The backend is **one always-on process** (`src/server.ts`): the REST API, the
WebSocket hub, and the Solana log indexer all run together. The indexer holds a
persistent `connection.onLogs(...)` subscription to a Solana RPC node, so this
cannot run on serverless / cron platforms -- it needs a container host that
keeps the process running 24/7.

Nothing else moves: the frontend stays on Vercel, the database stays on Neon.

## Recommended: Railway

Railway keeps the process running (no scale-to-zero on the Hobby plan),
supports WebSockets natively, and builds straight from the `Dockerfile` in this
directory. ~$5/mo.

### 1. Create the service

1. Sign in at <https://railway.app> with GitHub.
2. **New Project -> Deploy from GitHub repo -> `Dhruv-mavani/candl`**.
3. In the service's **Settings**:
   - **Root Directory**: `backend`
   - **Build**: Railway auto-detects `backend/Dockerfile`. Leave the builder on
     Dockerfile.
   - **Healthcheck Path**: `/health`

### 2. Set environment variables

In the service's **Variables** tab (copy the values from your local
`backend/.env`):

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string | `...-pooler.<region>.aws.neon.tech...` -- used by the API at runtime |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string | used only by `npm run migrate` |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | swap for a paid RPC (Helius / Triton / QuickNode) before mainnet |
| `CANDL_PROGRAM_ID` | `JDqvbHqaL1W57YALJnY1Lyyi6Ai5aFMaNi1mzYATTYAa` | without this the indexer stays idle |
| `ADMIN_SECRET` | a real secret | gates `/api/v1/admin/*` |
| `PORT` | *(leave unset)* | Railway injects it; `server.ts` reads it |

Migrations run automatically on every deploy (the container's start command is
`node dist/db/migrate.js && node dist/server.js`). Your Neon DB already has both
migrations applied, so the first run is a no-op.

### 3. Deploy and grab the URL

Trigger the deploy. When it's green, open **Settings -> Networking -> Generate
Domain**. You'll get something like `https://candl-backend-production.up.railway.app`.

Check it:

```bash
curl https://<your-domain>/health          # -> {"status":"ok"}
curl https://<your-domain>/api/v1/protocol/stats
```

The logs should show `[indexer] listening for logs from JDqv... on https://api.devnet.solana.com`.

### 4. Point the frontend at it

In the **Vercel** project (frontend), set:

```
NEXT_PUBLIC_API_URL = https://<your-railway-domain>
```

for Production (and Preview if you want), then redeploy the frontend. That env
var is the only thing wiring the two together -- `frontend/src/lib/api.ts` reads
it, defaulting to `http://localhost:4000` for local dev.

## Alternatives

Same `Dockerfile`, same env vars:

- **Render** -- "New Web Service", root `backend`, Docker runtime. Use a paid
  instance ($7/mo); the free tier sleeps after 15 min, which would stop the
  indexer.
- **Fly.io** -- `fly launch` in `backend/`, then set
  `[http_service] auto_stop_machines = false` and `min_machines_running = 1` in
  `fly.toml` so the indexer never gets suspended.
- **AWS App Runner** -- point it at the repo / an ECR image built from this
  Dockerfile; set the same env vars.

## Notes / follow-ups

- **CORS** is currently open to all origins (`app.register(cors)` with no
  options). Fine for now; tighten to the Vercel domain when convenient.
- **RPC limits**: the public devnet endpoint rate-limits aggressively. If the
  indexer logs RPC errors under load, move to a paid RPC sooner rather than later.
- **Scaling**: keep this at **one instance**. Two instances would double every
  indexer write. If volume grows enough to need horizontal scaling, split the
  indexer into its own single-instance worker and scale only the API.
