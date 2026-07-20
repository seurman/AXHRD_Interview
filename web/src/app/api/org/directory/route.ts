import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgOperational } from "@/lib/org/contract";

/**
 * 로그인 사용자용 기관 디렉터리 — 승인된 운영 기관만 이름·유형 공개.
 * 가입 코드는 노출하지 않음 (Slack 워크스페이스 디렉터리 패턴).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const orgs = await prisma.organization.findMany({
    where: {
      status: "APPROVED",
      ...(q
        ? {
            name: { contains: q, mode: "insensitive" },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      kind: true,
      status: true,
      validFrom: true,
      validUntil: true,
      requireMembershipApproval: true,
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json({
    organizations: orgs
      .filter((o) => isOrgOperational(o))
      .map((o) => ({
        id: o.id,
        name: o.name,
        kind: o.kind,
        memberCount: o._count.members,
        requireMembershipApproval: o.requireMembershipApproval,
      })),
  });
}
