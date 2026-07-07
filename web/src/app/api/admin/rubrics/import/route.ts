import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireContentAdminApi } from "@/lib/admin/auth";
import {
  normalizeImportLevels,
  parseRubricImportFile,
} from "@/lib/competency/rubric";

export async function POST(req: Request) {
  const auth = await requireContentAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => null);
  const parsed = parseRubricImportFile(body);
  if (!parsed?.competencies?.length) {
    return NextResponse.json(
      { error: "올바른 rubric JSON 형식이 아닙니다. 템플릿을 받아 참고해 주세요." },
      { status: 400 }
    );
  }

  let updated = 0;
  for (const item of parsed.competencies) {
    const code = item.code?.trim()?.toUpperCase();
    if (!code || !item.levels) continue;

    const comp = await prisma.competency.findUnique({ where: { code } });
    if (!comp) continue;

    const rubricByLevel = normalizeImportLevels(item.levels);
    if (Object.keys(rubricByLevel).length === 0) continue;

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

  return NextResponse.json({
    ok: true,
    updated,
    message: `${updated}개 역량의 루브릭이 반영되었습니다.`,
  });
}
