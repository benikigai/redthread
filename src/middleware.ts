import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo-day cost gate. If DEMO_PASSWORD is set in env, every page and every
 * /api/* route requires the `rt_gate` cookie (set by /gate after submitting
 * the shared password). Locks bots out of the expensive Claude/ElevenLabs
 * endpoints; judges enter the password once, then everything works normally
 * for the rest of the session.
 *
 * If DEMO_PASSWORD is unset, the gate is OFF (local dev convenience).
 */

const COOKIE_NAME = "rt_gate";

// Paths that are always allowed through, even without the cookie.
const ALWAYS_OPEN = [
  "/_next",
  "/gate",
  "/api/gate",
  "/.well-known",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

function isStaticAsset(pathname: string): boolean {
  return /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf|css|js|map)$/i.test(pathname);
}

export function middleware(req: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  if (ALWAYS_OPEN.some((p) => pathname === p || pathname.startsWith(p + "/")) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie === password) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({ error: "Unauthenticated. Visit /gate first." }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const gateUrl = new URL("/gate", req.url);
  gateUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  // Match everything except Next internals and image optimization. The
  // middleware itself handles asset filtering via ALWAYS_OPEN + isStaticAsset.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
