import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { SHOWCASE_ORG_NAME } from "@/lib/platform/showcase-org";
import { seedDemoArcIndex } from "@/lib/demo/seed-demo-arc-index";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = {
  /** technova | showcase | both (default) */
  scope?: "technova" | "showcase" | "both";
};

/** 운영 DB에 ARC 조직진단 데모 캠페인 시드 — 로컬 CLI는 prod DATABASE_URL 접근 불가 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const scope = body.scope ?? "both";

  try {
    const results: Record<string, unknown> = {};

    if (scope === "technova" || scope === "both") {
      results.technova = await seedDemoArcIndex(prisma);
    }

    if (scope === "showcase" || scope === "both") {
      const showcase = await prisma.organization.findFirst({
        where: { name: SHOWCASE_ORG_NAME },
        select: { id: true, name: true },
      });
      if (!showcase) {
        return NextResponse.json(
          { error: "쇼케이스 기관이 없습니다. 통합 데모 시드를 먼저 실행하세요." },
          { status: 400 },
        );
      }
      results.showcase = await seedDemoArcIndex(prisma, {
        organizationId: showcase.id,
        waveLabelPrefix: "쇼케이스",
      });
    }

    return NextResponse.json({
      ok: true,
      scope,
      results,
      message:
        "ARC 데모 캠페인이 생성되었습니다. Campaign 탭을 새로고침하세요. 기관 로그인(arc-demo-admin)은 /org/diagnosis 에서 확인합니다.",
    });
  } catch (e) {
    console.error("[admin/diagnostic/demo-arc-seed]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "데모 시드 실패" },
      { status: 500 },
    );
  }
}
