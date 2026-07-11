import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { loadTeamSurvey, teamCookieKey, diagnosticSessionCookieOptions } from "@/lib/diagnostic/survey-loader";

type Ctx = { params: Promise<{ waveSlug: string; teamSlug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { waveSlug, teamSlug } = await ctx.params;
  const jar = await cookies();
  const token = jar.get(teamCookieKey(waveSlug, teamSlug))?.value;

  const data = await loadTeamSurvey(waveSlug, teamSlug, token);
  if (!data) return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });

  if (data.wave.status === "CLOSED") {
    return NextResponse.json({ error: "응답 기간이 종료되었습니다.", closed: true }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function POST(_req: Request, ctx: Ctx) {
  const { waveSlug, teamSlug } = await ctx.params;
  const jar = await cookies();
  const cookieName = teamCookieKey(waveSlug, teamSlug);
  let token = jar.get(cookieName)?.value;

  const survey = await loadTeamSurvey(waveSlug, teamSlug, token);
  if (!survey || !survey.team) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }
  if (survey.wave.status === "CLOSED") {
    return NextResponse.json({ error: "응답 기간이 종료되었습니다." }, { status: 403 });
  }
  if (survey.response?.submittedAt) {
    return NextResponse.json({ error: "이미 제출된 응답입니다." }, { status: 400 });
  }

  if (!token) token = randomUUID();

  let responseId = survey.response?.id;
  if (!responseId) {
    const created = await prisma.diagnosticResponse.create({
      data: {
        waveId: survey.wave.id,
        teamId: survey.team.id,
        respondentToken: token,
      },
    });
    responseId = created.id;
  }

  const res = NextResponse.json({ ok: true, respondentToken: token, responseId });
  res.cookies.set(cookieName, token, diagnosticSessionCookieOptions());
  return res;
}
