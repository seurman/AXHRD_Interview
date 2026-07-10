import { NextResponse } from "next/server";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { scoreJdWithMeaningGraph } from "@/lib/meaning/jd-competency-match";
import { INDUSTRY_CODES, JOB_ROLES } from "@/types";
import type { IndustryCode, JobRoleCode } from "@/types";

/** CMS — JD 텍스트에 대한 Meaning Layer 역량 점수 미리보기 */
export async function POST(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const jdText = typeof body.jdText === "string" ? body.jdText.trim() : "";
  const industryCode =
    typeof body.industryCode === "string" && INDUSTRY_CODES.includes(body.industryCode as IndustryCode)
      ? (body.industryCode as IndustryCode)
      : null;
  const jobRoleCode =
    typeof body.jobRoleCode === "string" && JOB_ROLES.includes(body.jobRoleCode as JobRoleCode)
      ? (body.jobRoleCode as JobRoleCode)
      : null;

  if (!jdText || jdText.length < 10) {
    return NextResponse.json({ error: "미리볼 JD 텍스트가 너무 짧습니다." }, { status: 400 });
  }

  try {
    const scores = await scoreJdWithMeaningGraph({
      jdText,
      industryCode,
      jobRoleCode,
    });
    return NextResponse.json({ scores });
  } catch (e) {
    console.error("[admin/meaning/jd-preview]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ConceptRelation") || msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "Meaning Layer 테이블이 없습니다. migrate deploy 후 npm run db:seed:meaning 을 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "미리보기 실패" }, { status: 500 });
  }
}
