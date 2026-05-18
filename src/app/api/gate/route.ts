import { NextResponse } from "next/server";

// POST /api/gate — validates the shared demo password and sets the rt_gate
// cookie that the middleware looks for. Used by /gate/page.tsx.
//
// Body: { password: string }
// On success: 200, sets rt_gate (httpOnly, 12h)
// On failure: 401

export const runtime = "edge";

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: true, gateDisabled: true });
  }

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";

  // Constant-time compare to avoid trivial timing leaks. Both strings are
  // short and known length-bounded in practice; still worth the courtesy.
  if (password.length !== expected.length) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  let mismatch = 0;
  for (let i = 0; i < password.length; i++) {
    mismatch |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("rt_gate", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}
