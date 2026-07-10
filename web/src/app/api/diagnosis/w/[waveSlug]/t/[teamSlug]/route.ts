import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { SCALE_LABELS } from "@/lib/diagnostic/constants";

type Ctx = { params: Promise<{ waveSlug: string; teamSlug: string }> };

function cookieKey(waveSlug: string, teamSlug: string) {
  return `dx_rsp_${waveSlug}_${teamSlug}`;
}

async function loadSurvey(waveSlug: string, teamSlug: string, respondentToken?: string) {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { slug: waveSlug },
    include: {
      instrument: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              subscales: {
                orderBy: { order: "asc" },
                include: { items: { orderBy: { order: "asc" } } },
              },
              items: {
                where: { subscaleId: null },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      teams: { where: { slug: teamSlug } },
    },
  });
  if (!wave || wave.teams.length === 0) return null;
  const team = wave.teams[0];

  let response = respondentToken
    ? await prisma.diagnosticResponse.findUnique({
        where: { respondentToken },
        include: { answers: true },
      })
    : null;

  if (response && (response.waveId !== wave.id || response.teamId !== team.id)) {
    response = null;
  }

  const sections = wave.instrument.sections.map((sec) => ({
    code: sec.code,
    nameKo: sec.nameKo,
    subscales: sec.subscales.map((sub) => ({
      code: sub.code,
      nameKo: sub.nameKo,
      isDriver: sub.isDriver,
      items: sub.items.map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        textKo: item.textKo,
        scaleType: item.scaleType,
        scaleLabels:
          item.scaleLabels ??
          (item.scaleType !== "OPEN_TEXT"
            ? SCALE_LABELS[item.scaleType as keyof typeof SCALE_LABELS]
            : null),
        hasImportanceAxis: item.hasImportanceAxis,
        isDemographic: item.isDemographic,
        choiceOptions: item.choiceOptions,
      })),
    })),
    directItems: sec.items.map((item) => ({
      id: item.id,
      itemCode: item.itemCode,
      textKo: item.textKo,
      scaleType: item.scaleType,
      scaleLabels:
        item.scaleLabels ??
        (item.scaleType !== "OPEN_TEXT"
          ? SCALE_LABELS[item.scaleType as keyof typeof SCALE_LABELS]
          : null),
      hasImportanceAxis: item.hasImportanceAxis,
      isDemographic: item.isDemographic,
      choiceOptions: item.choiceOptions,
    })),
  }));

  const answerMap: Record<string, { current?: number; importance?: number; text?: string }> = {};
  if (response) {
    for (const a of response.answers) {
      if (!answerMap[a.itemId]) answerMap[a.itemId] = {};
      if (a.axis === "CURRENT") {
        if (a.numericValue != null) answerMap[a.itemId].current = a.numericValue;
        if (a.textValue) answerMap[a.itemId].text = a.textValue;
      } else if (a.numericValue != null) {
        answerMap[a.itemId].importance = a.numericValue;
      }
    }
  }

  return {
    wave: {
      id: wave.id,
      label: wave.label,
      status: wave.status,
      estimatedMinutes: wave.instrument.estimatedMinutes,
    },
    team: { id: team.id, name: team.name },
    instrument: { nameKo: wave.instrument.nameKo, version: wave.instrument.version },
    sections,
    response: response
      ? {
          id: response.id,
          respondentToken: response.respondentToken,
          demographics: response.demographics,
          consentAt: response.consentAt?.toISOString() ?? null,
          submittedAt: response.submittedAt?.toISOString() ?? null,
          answers: answerMap,
        }
      : null,
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const { waveSlug, teamSlug } = await ctx.params;
  const jar = await cookies();
  const token = jar.get(cookieKey(waveSlug, teamSlug))?.value;

  const data = await loadSurvey(waveSlug, teamSlug, token);
  if (!data) return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });

  if (data.wave.status === "CLOSED") {
    return NextResponse.json({ error: "응답 기간이 종료되었습니다.", closed: true }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request, ctx: Ctx) {
  const { waveSlug, teamSlug } = await ctx.params;
  const jar = await cookies();
  const cookieName = cookieKey(waveSlug, teamSlug);
  let token = jar.get(cookieName)?.value;

  const survey = await loadSurvey(waveSlug, teamSlug, token);
  if (!survey) return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  if (survey.wave.status === "CLOSED") {
    return NextResponse.json({ error: "응답 기간이 종료되었습니다." }, { status: 403 });
  }
  if (survey.response?.submittedAt) {
    return NextResponse.json({ error: "이미 제출된 응답입니다." }, { status: 400 });
  }

  if (!token) {
    token = randomUUID();
  }

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
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: `/diagnosis/w/${waveSlug}/t/${teamSlug}`,
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
