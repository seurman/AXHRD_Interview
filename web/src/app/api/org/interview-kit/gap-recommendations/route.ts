import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveInterviewKitAccess } from "@/lib/org/interview-kit";
import { getCompetencyGapRecommendations } from "@/lib/diagnostic/gap-recommendations";
import { prisma } from "@/lib/prisma";

const ACCESS_ERRORS: Record<string, string> = {
  not_admin: "기관 ADMIN 권한이 필요합니다.",
  no_org: "대상 기관을 찾을 수 없습니다.",
  not_enabled: "SaaS 개인화 권한이 부여되지 않은 기관입니다. 슈퍼어드민에게 문의하세요.",
};

function accessErrorResponse(reason: string) {
  return NextResponse.json(
    { error: ACCESS_ERRORS[reason] ?? "권한이 없습니다.", code: reason },
    { status: 403 },
  );
}

/**
 * GET /api/org/interview-kit/gap-recommendations[?organizationId=]
 * Gap-to-Hire 추천. diagnosticEnabled && interviewEnabled 가 아니면 404(미노출).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationIdParam = searchParams.get("organizationId");
  const access = await resolveInterviewKitAccess(user, organizationIdParam);
  if (!access.allowed) {
    return accessErrorResponse(access.reason);
  }

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { diagnosticEnabled: true, interviewEnabled: true },
  });

  if (!org?.diagnosticEnabled || !org.interviewEnabled) {
    return NextResponse.json(
      { error: "조직진단·면접이 모두 활성화된 기관에서만 사용할 수 있습니다.", code: "feature_disabled" },
      { status: 404 },
    );
  }

  const result = await getCompetencyGapRecommendations(access.organizationId);
  return NextResponse.json(result);
}
