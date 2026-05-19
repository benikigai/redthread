import { NextResponse, type NextRequest } from "next/server";

// Demo gate disabled — the dashboard runs in fixture/demo mode by default
// and there are no expensive API paths to protect. Kept as a no-op so a
// future env-driven gate can be reintroduced without re-adding the file.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
