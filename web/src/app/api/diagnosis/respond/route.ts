import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DIAGNOSTIC_CONSENT_TEXT } from "@/lib/diagnostic/constants";
import { orgWideCookieKey, teamCookieKey } from "@/lib/diagnostic/survey-loader";

type AnswerInput = {
  itemId: string;
  axis?: "CURRENT" | "IMPORTANCE";
  numericValue?: number | null;
  textValue?: string | null;
};

type Body = {
  waveSlug: string;
  teamSlug?: string;
  answers?: AnswerInput[];
  demographics?: Record<string, string>;
  consent?: boolean;
  submit?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const waveSlug = body.waveSlug?.trim();
  const teamSlug = body.teamSlug?.trim();
  if (!waveSlug) {
    return NextResponse.json({ error: "waveSlug가 필요합니다." }, { status: 400 });
  }

  const jar = await cookies();
  const isOrgWide = !teamSlug;
  const ck = isOrgWide ? orgWideCookieKey(waveSlug) : teamCookieKey(waveSlug, teamSlug!);
  const token = jar.get(ck)?.value;
  if (!token) {
    return NextResponse.json({ error: "응답 세션이 없습니다. 페이지를 새로고침해 주세요." }, { status: 401 });
  }

  const response = await prisma.diagnosticResponse.findUnique({
    where: { respondentToken: token },
    include: { wave: true, team: true },
  });
  if (!response || response.wave.slug !== waveSlug) {
    return NextResponse.json({ error: "유효하지 않은 응답 세션입니다." }, { status: 403 });
  }
  if (isOrgWide) {
    if (response.teamId != null) {
      return NextResponse.json({ error: "유효하지 않은 응답 세션입니다." }, { status: 403 });
    }
  } else if (response.team?.slug !== teamSlug) {
    return NextResponse.json({ error: "유효하지 않은 응답 세션입니다." }, { status: 403 });
  }
  if (response.submittedAt) {
    return NextResponse.json({ error: "이미 제출된 응답입니다." }, { status: 400 });
  }
  if (response.wave.status === "CLOSED") {
    return NextResponse.json({ error: "응답 기간이 종료되었습니다." }, { status: 403 });
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  for (const a of answers) {
    if (!a.itemId) continue;
    const axis = a.axis === "IMPORTANCE" ? "IMPORTANCE" : "CURRENT";
    const numericValue =
      typeof a.numericValue === "number" && a.numericValue >= 1 && a.numericValue <= 5
        ? Math.round(a.numericValue)
        : null;
    const textValue = typeof a.textValue === "string" ? a.textValue.trim() || null : null;

    await prisma.diagnosticAnswer.upsert({
      where: {
        responseId_itemId_axis: {
          responseId: response.id,
          itemId: a.itemId,
          axis,
        },
      },
      create: {
        responseId: response.id,
        itemId: a.itemId,
        axis,
        numericValue,
        textValue,
      },
      update: { numericValue, textValue },
    });
  }

  const updateData: {
    demographics?: Record<string, string>;
    consentAt?: Date;
    submittedAt?: Date;
  } = {};

  if (body.demographics && typeof body.demographics === "object") {
    updateData.demographics = body.demographics;
  }

  if (body.submit) {
    if (!body.consent) {
      return NextResponse.json(
        { error: "제출하려면 데이터 활용 동의가 필요합니다.", consentText: DIAGNOSTIC_CONSENT_TEXT },
        { status: 400 },
      );
    }
    updateData.consentAt = new Date();
    updateData.submittedAt = new Date();
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.diagnosticResponse.update({
      where: { id: response.id },
      data: updateData,
    });
  }

  return NextResponse.json({
    ok: true,
    submitted: !!body.submit,
    submittedAt: body.submit ? new Date().toISOString() : null,
  });
}
