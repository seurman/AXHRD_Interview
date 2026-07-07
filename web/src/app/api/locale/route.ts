import { NextResponse } from "next/server";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";

export async function POST(req: Request) {
  const body = (await req.json()) as { locale?: string };
  const locale: Locale = body.locale === "en" ? "en" : "ko";

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
