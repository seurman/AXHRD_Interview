import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { INDUSTRY_CODES, JOB_ROLES } from "@/types";
import type { IndustryCode, JobRoleCode } from "@/types";
import {
  appendUserTextRecord,
  formatProfilePreferenceText,
} from "@/lib/user-text-archive";

/** 질문 카드에서 쓸 "본인이 결정한" 산업군·직무를 저장 — UserProfile은 지금까지
 *  어디서도 실제로 쓰이지 않던 필드였는데(항상 기본값 OTHER만 표시), 이번에 처음 연결됨 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json();
  const { desiredIndustry, desiredJobRole } = body as {
    desiredIndustry?: string;
    desiredJobRole?: string;
  };

  const industryValid = (INDUSTRY_CODES as readonly string[]).includes(desiredIndustry ?? "");
  const jobRoleValid = (JOB_ROLES as readonly string[]).includes(desiredJobRole ?? "");
  if (!industryValid || !jobRoleValid) {
    return NextResponse.json({ error: "산업군/직무 값이 올바르지 않습니다." }, { status: 400 });
  }

  const industry = desiredIndustry as IndustryCode;
  const jobRole = desiredJobRole as JobRoleCode;

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, desiredIndustry: industry, desiredJobRole: jobRole },
    update: { desiredIndustry: industry, desiredJobRole: jobRole },
  });

  void appendUserTextRecord({
    userId: user.id,
    kind: "PROFILE_PREFERENCE",
    content: formatProfilePreferenceText({ industry, jobRole }),
    sourceType: "user_profile",
    sourceId: user.id,
  });

  return NextResponse.json({
    desiredIndustry: profile.desiredIndustry,
    desiredJobRole: profile.desiredJobRole,
  });
}
