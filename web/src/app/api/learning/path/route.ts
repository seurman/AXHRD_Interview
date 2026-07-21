import { NextResponse } from "next/server";
import type { CareerTrack } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { listPathOverview, resolveUserTrack } from "@/lib/learning/path";
import { getUsageSummary } from "@/lib/billing/usage";

const TRACKS: CareerTrack[] = ["NEW_GRAD", "EXPERIENCED"];

/** 역량 학습 패스 개요 + 일일 드릴 한도 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(req.url);
  const trackParam = url.searchParams.get("track") as CareerTrack | null;
  const track =
    trackParam && TRACKS.includes(trackParam)
      ? trackParam
      : await resolveUserTrack(user.id);

  const [competencies, usage, dbUser] = await Promise.all([
    listPathOverview(user.id, track),
    getUsageSummary(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { careerTrack: true },
    }),
  ]);

  return NextResponse.json({
    track,
    careerTrack: dbUser?.careerTrack ?? "NEW_GRAD",
    competencies,
    usage: {
      planTier: usage.planTier,
      dailyDrills: usage.dailyDrills,
      mockInterviews: usage.mockInterviews,
    },
  });
}

/** 기본 학습 트랙(신입/경력) 저장 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as { track?: CareerTrack };
  if (!body.track || !TRACKS.includes(body.track)) {
    return NextResponse.json({ error: "track은 NEW_GRAD 또는 EXPERIENCED여야 합니다." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { careerTrack: body.track },
  });

  return NextResponse.json({ ok: true, track: body.track });
}
