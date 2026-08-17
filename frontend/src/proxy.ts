import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// While the site is pre-launch (NEXT_PUBLIC_WAITLIST_MODE), only the home page,
// the waitlist form, and the admin dashboard should be reachable -- everything
// else (marketplace, portfolio, market detail pages) redirects home. Mirrors
// the nav/footer link gating in AppLayout.tsx.
const ALLOWED_PREFIXES = ["/waitlist", "/admin", "/privacy", "/terms"];

export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_WAITLIST_MODE !== "true") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/") return NextResponse.next();
  if (ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  // Exclude any path with a file extension (images, icons, etc. under public/)
  // in addition to _next/api/favicon.ico -- otherwise static assets get
  // redirected home along with real pages.
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
