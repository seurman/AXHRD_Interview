import { NextResponse } from "next/server";
import type { RubricScoringSystem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { upsertRubricSet } from "@/lib/repository/service";

const SCORING: RubricScoringSystem[] = ["FIVE_SCALE", "THREE_SCALE", "PASS_FAIL"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.rubricSet.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "루브릭 세트를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const rubricName = typeof body.rubricName === "string" ? body.rubricName.trim() : existing.rubricName;
  const scoringSystem = (body.scoringSystem ?? existing.scoringSystem) as RubricScoringSystem;
  const organizationId =
    body.organizationId === null
      ? null
      : typeof body.organizationId === "string"
        ? body.organizationId
        : existing.organizationId;
  const isDefault = body.isDefault === true;
  const details = Array.isArray(body.details) ? body.details : undefined;

  if (!SCORING.includes(scoringSystem)) {
    return NextResponse.json({ error: "유효하지 않은 scoringSystem입니다." }, { status: 400 });
  }

  let parsedDetails = existing
    ? (
        await prisma.rubricDetail.findMany({
          where: { rubricSetId: id },
          orderBy: { scoreLevel: "desc" },
        })
      ).map((d) => ({
        scoreLevel: d.scoreLevel,
        levelName: d.levelName,
        behavioralIndicator: d.behavioralIndicator,
      }))
    : [];

  if (details) {
    parsedDetails = details
      .map((d: { scoreLevel?: number; levelName?: string; behavioralIndicator?: string }) => ({
        scoreLevel: Number(d.scoreLevel),
        levelName: typeof d.levelName === "string" ? d.levelName : null,
        behavioralIndicator:
          typeof d.behavioralIndicator === "string" ? d.behavioralIndicator : "",
      }))
      .filter((d) => Number.isFinite(d.scoreLevel) && d.behavioralIndicator.trim());
  }

  const rubricSet = await upsertRubricSet({
    id,
    organizationId,
    competencyId: existing.competencyId,
    rubricName,
    scoringSystem,
    isDefault,
    details: parsedDetails,
  });

  return NextResponse.json({ rubricSet });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.rubricSet.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "루브릭 세트를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.rubricSet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
