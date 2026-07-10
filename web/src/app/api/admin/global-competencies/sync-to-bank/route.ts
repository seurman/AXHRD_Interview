import { NextResponse } from "next/server";
import {
  auditActor,
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { syncGlobalCompetenciesToUnifiedBank } from "@/lib/competency/unified-bank-sync";
import { syncDefaultRubricSetFromLegacy } from "@/lib/competency/rubric-sync";
import { prisma } from "@/lib/prisma";

/** GlobalCompetency* → 통합 Competency/Question 풀 동기화 (import 경로) */
export async function POST() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const result = await syncGlobalCompetenciesToUnifiedBank();

    const globalComps = await prisma.competency.findMany({
      where: { source: "GLOBAL", ownerScope: "PLATFORM", organizationId: null },
      select: { id: true, code: true, nameKo: true, rubricByLevel: true },
    });

    let rubricSetsSynced = 0;
    for (const comp of globalComps) {
      const synced = await syncDefaultRubricSetFromLegacy(comp.id, comp.rubricByLevel, {
        code: comp.code,
        nameKo: comp.nameKo,
      });
      if (synced) rubricSetsSynced += 1;
    }

    await logAdminAudit({
      actor: auditActor(auth),
      action: "BULK_IMPORT",
      entityType: "global_competency_pool",
      entityId: "unified-bank",
      summary: `글로벌 사전 → 플랫폼 뱅크 동기화 (${result.competencies}역량, ${result.questions}문항)`,
      afterState: { ...result, rubricSetsSynced },
    });

    return NextResponse.json({
      ok: true,
      ...result,
      rubricSetsSynced,
    });
  } catch (e) {
    console.error("[global-competencies/sync-to-bank]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("GlobalCompetency")) {
      return NextResponse.json(
        {
          error:
            "글로벌 역량사전 테이블이 없습니다. migrate deploy 후 npm run db:seed:global 을 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "동기화 실패" }, { status: 500 });
  }
}
