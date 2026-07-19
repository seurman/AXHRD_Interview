import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  auditActor,
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateScenarioDraftFromDocument,
  ScenarioDraftError,
} from "@/lib/assessment/generate-scenario-draft";
import {
  createScenarioFromDraft,
  toAdminScenarioDto,
} from "@/lib/assessment/admin-scenario-service";
import type { AssessmentScenarioKind } from "@prisma/client";

export const maxDuration = 120;

type GenerateBody = {
  sourceId?: string;
  /** ROLE_PLAY | IN_BASKET | BOTH */
  modes?: string[] | string;
  /** 업종·직급·톤 등 추가 지시 */
  guidance?: string;
};

/** 업로드 원문 → 역할연기/서류함 초안 생성 (DRAFT, 비활성) */
export async function POST(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const rl = checkRateLimit(`admin:assessment-generate:${auth.id}`, 8, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId가 필요합니다." }, { status: 400 });
  }

  const source = await prisma.assessmentTaskSource.findUnique({
    where: { id: sourceId },
  });
  if (!source) {
    return NextResponse.json({ error: "원문을 찾을 수 없습니다." }, { status: 404 });
  }

  const rawModes = Array.isArray(body.modes)
    ? body.modes
    : typeof body.modes === "string"
      ? [body.modes]
      : ["ROLE_PLAY"];
  const modes = new Set<AssessmentScenarioKind>();
  for (const m of rawModes) {
    if (m === "BOTH") {
      modes.add("ROLE_PLAY");
      modes.add("IN_BASKET");
    } else if (m === "ROLE_PLAY" || m === "IN_BASKET") {
      modes.add(m);
    }
  }
  if (modes.size === 0) modes.add("ROLE_PLAY");

  const guidance =
    typeof body.guidance === "string" && body.guidance.trim()
      ? body.guidance.trim().slice(0, 2000)
      : null;

  const availableCompetencies = await prisma.competency.findMany({
    where: {
      organizationId: null,
      ownerScope: "PLATFORM",
      isActive: true,
      lifecycleStatus: "ACTIVE",
    },
    orderBy: { sortOrder: "asc" },
    select: { code: true, nameKo: true, description: true },
    take: 40,
  });

  if (availableCompetencies.length === 0) {
    return NextResponse.json(
      { error: "활성화된 플랫폼 역량이 없습니다. 먼저 역량 뱅크를 준비해 주세요." },
      { status: 400 },
    );
  }

  const created = [];
  const errors: string[] = [];

  for (const kind of modes) {
    try {
      const draft = await generateScenarioDraftFromDocument({
        kind,
        extractedText: source.extractedText,
        availableCompetencies,
        guidance,
      });
      const scenario = await createScenarioFromDraft({
        draft,
        sourceId: source.id,
        createdByUserId: auth.id,
      });
      created.push(toAdminScenarioDto(scenario));
      await logAdminAudit({
        actor: auditActor(auth),
        action: "CREATE",
        entityType: "assessment_scenario",
        entityId: scenario.id,
        summary: `AI 초안 생성(${kind}): ${scenario.code}`,
        beforeState: null,
        afterState: { code: scenario.code, kind, sourceId: source.id },
      });
    } catch (e) {
      if (e instanceof ScenarioDraftError) {
        errors.push(`${kind}: ${e.message}`);
      } else {
        errors.push(
          `${kind}: ${e instanceof Error ? e.message : "생성 중 오류"}`,
        );
      }
    }
  }

  if (created.length === 0) {
    return NextResponse.json(
      {
        error: "초안을 생성하지 못했습니다.",
        details: errors,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ scenarios: created, errors });
}
