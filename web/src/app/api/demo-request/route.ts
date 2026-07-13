import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

type DemoRequestBody = {
  company?: string;
  nameRole?: string;
  email?: string;
  solution?: string;
};

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`demo-request:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: DemoRequestBody;
  try {
    body = (await request.json()) as DemoRequestBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const company = body.company?.trim() ?? "";
  const email = body.email?.trim() ?? "";

  if (!company || !email) {
    return NextResponse.json(
      { error: "회사명과 업무 이메일은 필수입니다." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "올바른 이메일 형식이 아닙니다." },
      { status: 400 },
    );
  }

  // TODO: CRM / 이메일 알림 연동
  console.info("[demo-request]", {
    company,
    nameRole: body.nameRole?.trim() ?? "",
    email,
    solution: body.solution?.trim() ?? "",
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
