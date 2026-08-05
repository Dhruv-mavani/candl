import type { CandleResolution } from "../../db/schema.js";

// Every interval supported by the protocol, per docs/05-architecture.md and
// docs/07-backend.md.
export const RESOLUTIONS: CandleResolution[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

export const RESOLUTION_SECONDS: Record<CandleResolution, number> = {
  "1m": 60,
  "5m": 5 * 60,
  "15m": 15 * 60,
  "30m": 30 * 60,
  "1h": 60 * 60,
  "4h": 4 * 60 * 60,
  "1d": 24 * 60 * 60,
};
