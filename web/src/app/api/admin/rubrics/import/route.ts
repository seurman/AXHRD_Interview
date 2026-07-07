import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditActor, isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import {
  normalizeImportLevels,
  parseRubricImportFile,
} from "@/lib/competency/rubric";

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => null);
  const parsed = parseRubricImportFile(body);
  if (!parsed?.competencies?.length) {
    return NextResponse.json(
      { error: "올바른 rubric JSON 형식이 아닙니다. 템플릿을 받아 참고해 주세요." },
      { status: 400 }
    );
  }

  const beforeItems: Array<{ competencyId: string; code: string; rubricByLevel: unknown }> =
    [];
  let updated = 0;

  for (const item of parsed.competencies) {
    const code = item.code?.trim()?.toUpperCase();
    if (!code || !item.levels) continue;

    const comp = await prisma.competency.findUnique({ where: { code } });
    if (!comp) continue;

    const rubricByLevel = normalizeImportLevels(item.levels);
    if (Object.keys(rubricByLevel).length === 0) continue;

    beforeItems.push({
      competencyId: comp.id,
      code: comp.code,
      rubricByLevel: comp.rubricByLevel,
    });

    await prisma.competency.update({
      where: { id: comp.id },
      data: { rubricByLevel: rubricByLevel as Prisma.InputJsonValue },
    });
    updated++;
  }

  if (updated === 0) {
    return NextResponse.json(
      { error: "일치하는 역량 코드가 없습니다. code 필드를 확인해 주세요." },
      { status: 400 }
    );
  }

  await logAdminAudit({
    actor: auditActor(auth),
    action: "BULK_IMPORT",
    entityType: "rubric_import",
    entityId: null,
    summary: `루브릭 일괄 반영 ${updated}개 역량`,
    beforeState: { items: beforeItems },
    afterState: { competencyCodes: beforeItems.map((b) => b.code) },
  });

  return NextResponse.json({
    ok: true,
    updated,
    message: `${updated}개 역량의 루브릭이 반영되었습니다.`,
  });
}
