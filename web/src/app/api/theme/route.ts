import { NextResponse } from "next/server";
import { THEME_COOKIE, type Theme } from "@/lib/theme/types";

export async function POST(req: Request) {
  const body = (await req.json()) as { theme?: string };
  const theme: Theme =
    body.theme === "dark" ? "dark" : body.theme === "light" ? "light" : "system";

  const res = NextResponse.json({ ok: true, theme });
  res.cookies.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
