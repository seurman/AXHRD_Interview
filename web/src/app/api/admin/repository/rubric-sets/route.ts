import { NextResponse } from "next/server";
import type { RubricScoringSystem } from "@prisma/client";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import {
  listRubricSetsForCompetency,
  upsertRubricSet,
} from "@/lib/repository/service";
import type { RubricDetailInput } from "@/lib/repository/types";

const SCORING: RubricScoringSystem[] = ["FIVE_SCALE", "THREE_SCALE", "PASS_FAIL"];

export async function GET(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const competencyId = new URL(req.url).searchParams.get("competencyId");
  if (!competencyId) {
    return NextResponse.json({ error: "competencyId가 필요합니다." }, { status: 400 });
  }

  const rubricSets = await listRubricSetsForCompetency(competencyId);
  return NextResponse.json({ rubricSets });
}

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const competencyId = typeof body.competencyId === "string" ? body.competencyId : "";
  const rubricName = typeof body.rubricName === "string" ? body.rubricName.trim() : "";
  const scoringSystem = (body.scoringSystem ?? "FIVE_SCALE") as RubricScoringSystem;
  const organizationId =
    body.organizationId === null || body.organizationId === undefined
      ? null
      : typeof body.organizationId === "string"
        ? body.organizationId
        : null;
  const isDefault = body.isDefault === true;
  const details = Array.isArray(body.details) ? body.details : [];

  if (!competencyId || !rubricName) {
    return NextResponse.json(
      { error: "competencyId와 rubricName이 필요합니다." },
      { status: 400 },
    );
  }
  if (!SCORING.includes(scoringSystem)) {
    return NextResponse.json({ error: "유효하지 않은 scoringSystem입니다." }, { status: 400 });
  }

  const parsedDetails = details
    .map((d: { scoreLevel?: number; levelName?: string; behavioralIndicator?: string }) => ({
      scoreLevel: Number(d.scoreLevel),
      levelName: typeof d.levelName === "string" ? d.levelName : null,
      behavioralIndicator:
        typeof d.behavioralIndicator === "string" ? d.behavioralIndicator : "",
    }))
    .filter(
      (d: RubricDetailInput) =>
        Number.isFinite(d.scoreLevel) && d.behavioralIndicator.trim().length > 0,
    );

  if (parsedDetails.length === 0) {
    return NextResponse.json(
      { error: "최소 1개 이상의 루브릭 레벨 설명이 필요합니다." },
      { status: 400 },
    );
  }

  const rubricSet = await upsertRubricSet({
    organizationId,
    competencyId,
    rubricName,
    scoringSystem,
    isDefault,
    details: parsedDetails,
  });

  return NextResponse.json({ rubricSet }, { status: 201 });
}
