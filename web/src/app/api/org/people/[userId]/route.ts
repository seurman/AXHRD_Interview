import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser, isOrgStaffUser, type RoleUser } from "@/lib/auth/roles";
import { getOrgMemberPeopleDetail } from "@/lib/org/people-dashboard";
import { COHORT_MEMBER_ROLES } from "@/lib/auth/roles";

function canCoach(user: RoleUser) {
  return !!user.organizationId && (isOrgAdminUser(user) || isOrgStaffUser(user));
}

type Ctx = { params: Promise<{ userId: string }> };

/** 구성원 상세(집계) — 동의 없어도 집계·접속·피드백은 조회 가능, 상세 시계열은 동의 시 */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user || !canCoach(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }
  const { userId } = await ctx.params;
  const detail = await getOrgMemberPeopleDetail(user.organizationId!, userId);
  if (!detail) {
    return NextResponse.json({ error: "구성원을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!detail.member.coachingConsent) {
    return NextResponse.json({
      ...detail,
      competencySeries: [],
      dimensionTimeline: [],
      scores: { ...detail.scores, latestByCompetency: [] },
      consentRequired: true,
    });
  }
  return NextResponse.json({ ...detail, consentRequired: false });
}

/** 코칭 피드백 작성 */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user || !canCoach(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length < 2) {
    return NextResponse.json({ error: "피드백 내용을 입력해 주세요." }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "피드백은 4,000자 이하로 작성해 주세요." }, { status: 400 });
  }

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, orgRole: true },
  });
  if (
    !member ||
    member.organizationId !== user.organizationId ||
    !COHORT_MEMBER_ROLES.includes(member.orgRole as (typeof COHORT_MEMBER_ROLES)[number])
  ) {
    return NextResponse.json({ error: "구성원을 찾을 수 없습니다." }, { status: 404 });
  }

  const created = await prisma.orgMemberFeedback.create({
    data: {
      organizationId: user.organizationId!,
      memberUserId: member.id,
      authorUserId: user.id,
      body: text,
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({
    feedback: {
      id: created.id,
      body: created.body,
      authorName: created.author.name,
      createdAt: created.createdAt.toISOString(),
      readAt: null,
    },
  });
}
