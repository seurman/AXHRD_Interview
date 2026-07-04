import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
