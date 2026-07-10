import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import { ARC_SECTION_CODES } from "@/lib/diagnostic/campaigns";

function accessError(reason: string) {
  return NextResponse.json(
    {
      error: DIAGNOSTIC_ACCESS_ERRORS[reason as keyof typeof DIAGNOSTIC_ACCESS_ERRORS] ?? "권한이 없습니다.",
      code: reason,
    },
    { status: 403 },
  );
}

async function resolveAccess(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const access = await resolveDiagnosticAccess(user, organizationId);
  if (!access.allowed) return { error: accessError(access.reason) };
  return { user, access };
}

/** Org 캠페인 생성용 — ARC Index 섹션 메타 */
export async function GET(req: Request) {
  const resolved = await resolveAccess(req);
  if ("error" in resolved && resolved.error) return resolved.error;

  const instrument = await prisma.diagnosticInstrument.findUnique({
    where: { code: "ARC_INDEX" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: { code: true, nameKo: true },
      },
    },
  });

  if (!instrument) {
    return NextResponse.json(
      { error: "ARC Index 문항뱅크가 설치되지 않았습니다. 운영팀에 문의하세요." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    instrument: {
      id: instrument.id,
      code: instrument.code,
      nameKo: instrument.nameKo,
      sections: instrument.sections,
      defaultSectionCodes: [...ARC_SECTION_CODES],
    },
  });
}
