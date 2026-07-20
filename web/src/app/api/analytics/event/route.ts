import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";

/** 면접 퍼널 이벤트 수집 — DB 없이 구조화 로그 (분석 파이프라인 연결용) */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const rlKey = user?.id ?? req.headers.get("x-forwarded-for") ?? "anon";
  const rl = checkRateLimit(`funnel:${rlKey}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    event?: string;
    props?: Record<string, unknown>;
    t?: number;
  } | null;

  if (!body?.event || typeof body.event !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  console.info(
    JSON.stringify({
      type: "funnel",
      event: body.event,
      props: body.props ?? {},
      t: body.t ?? Date.now(),
      userId: user?.id ?? null,
    }),
  );

  return NextResponse.json({ ok: true });
}
