import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo-day cost gate. If DEMO_PASSWORD is set in env, every /api/* route
 * (except /api/gate itself) requires the `rt_gate` cookie. Pages stay
 * publicly viewable — LinkedIn traffic can see the dashboard and the
 * primed fixture. Interactions trigger a modal that POSTs to /api/gate;
 * the cookie unlocks the session for 12h.
 *
 * If DEMO_PASSWORD is unset, the gate is OFF (local dev convenience).
 */

const COOKIE_NAME = "rt_gate";

// API paths that are always open (no cookie required).
const ALWAYS_OPEN_API = ["/api/gate"];

export function middleware(req: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Only guard /api/*. Pages render freely; client modal handles unlock UX.
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  if (ALWAYS_OPEN_API.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie === password) return NextResponse.next();

  return new NextResponse(
    JSON.stringify({ error: "locked", message: "Demo locked. POST /api/gate with the password to unlock." }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
