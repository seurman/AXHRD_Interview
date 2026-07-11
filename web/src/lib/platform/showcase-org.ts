import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/org/join-code";

export const SHOWCASE_ORG_NAME = "AXHRD 쇼케이스 (매뉴얼·시연)";

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateJoinCode();
    const exists = await prisma.organization.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new Error("쇼케이스 가입 코드 생성 실패");
}

/** 비즈니스·데모 어드민 시연용 — 전 SKU 활성 샌드박스 기관 */
export async function ensureShowcaseOrganization() {
  const existing = await prisma.organization.findFirst({
    where: { name: SHOWCASE_ORG_NAME },
  });
  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedAt: existing.approvedAt ?? new Date(),
        diagnosticEnabled: true,
        interviewEnabled: true,
        saasPersonalizationEnabled: true,
      },
    });
  }

  const joinCode = await uniqueJoinCode();
  return prisma.organization.create({
    data: {
      name: SHOWCASE_ORG_NAME,
      kind: "HR_ENTERPRISE",
      joinCode,
      status: "APPROVED",
      approvedAt: new Date(),
      diagnosticEnabled: true,
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      adminNotes: "비즈니스·데모 어드민 매뉴얼·고객 시연용 샌드박스",
    },
  });
}
