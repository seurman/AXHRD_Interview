import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { blockPersonalTrialApi } from "@/lib/auth/personal-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkUsageLimit } from "@/lib/billing/usage";
import { loadPublicKitShare } from "@/lib/org/kit-share";
import { startInterviewSession, type StartSessionBody } from "@/lib/interview/start-session";

type Ctx = { params: Promise<{ slug: string }> };

/** 공유 링크를 통한 면접 시작 — 로그인은 필요하지만(세션은 User에 귀속되어야 하므로)
 *  기관 가입(joinCode)이나 ADMIN 권한은 전혀 필요 없다. B2B 랜딩/추천 채용 캠페인
 *  등에서 "이 회사처럼 면접 연습하기" 링크로 바로 진입하는 용도. */
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: `/auth/login?next=${encodeURIComponent(`/kit/${slug}`)}` },
      { status: 401 }
    );
  }

  const trialBlock = await blockPersonalTrialApi(user);
  if (trialBlock) return trialBlock;

  const share = await loadPublicKitShare(slug);
  if (!share) {
    return NextResponse.json({ error: "링크를 찾을 수 없거나 만료되었습니다." }, { status: 404 });
  }

  const rl = checkRateLimit(`interview:start:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "면접 세션 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const usage = await checkUsageLimit(user.id, "mock_interview");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.message,
        code: "PLAN_LIMIT_EXCEEDED",
        upgradeUrl: usage.upgradeUrl,
        used: usage.used,
        limit: usage.limit,
      },
      { status: 402 }
    );
  }

  const body = (await req.json()) as StartSessionBody;
  const allowedCompetencies = share.competencies.map((c) => c.code);
  if (allowedCompetencies.length === 0) {
    return NextResponse.json(
      { error: "이 링크에 설정된 역량이 없습니다. 기관 담당자에게 문의해 주세요." },
      { status: 409 }
    );
  }

  // 공유 킷의 organizationId를 명시적으로 넘겨 문항 필터·루브릭을 적용한다 —
  // 이 사용자가 그 기관에 소속(가입)돼 있지 않아도 된다.
  const shareRow = await prisma.orgInterviewKitShare.findUnique({ where: { slug } });

  const result = await startInterviewSession(user, body, {
    kitOrganizationId: share.organizationId,
    allowedCompetencies,
    orgKitShareId: shareRow?.id ?? null,
  });

  return NextResponse.json(result.body, { status: result.status });
}
