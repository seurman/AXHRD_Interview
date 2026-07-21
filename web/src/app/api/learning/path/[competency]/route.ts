import { NextResponse } from "next/server";
import type { CareerTrack } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";
import {
  getCompetencyPathDetail,
  resolveUserTrack,
} from "@/lib/learning/path";

type Ctx = { params: Promise<{ competency: string }> };

const TRACKS: CareerTrack[] = ["NEW_GRAD", "EXPERIENCED"];

export async function GET(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { competency: raw } = await ctx.params;
  const competency = raw?.toUpperCase() as CompetencyCode;
  if (!COMPETENCY_CODES.includes(competency)) {
    return NextResponse.json({ error: "알 수 없는 역량 코드입니다." }, { status: 400 });
  }

  const url = new URL(req.url);
  const trackParam = url.searchParams.get("track") as CareerTrack | null;
  const track =
    trackParam && TRACKS.includes(trackParam)
      ? trackParam
      : await resolveUserTrack(user.id);

  const detail = await getCompetencyPathDetail(user.id, competency, track);
  return NextResponse.json(detail);
}
