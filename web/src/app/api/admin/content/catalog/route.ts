import { NextResponse } from "next/server";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { loadDemoCatalogMetadata } from "@/lib/demo/catalog";

/** 운영 CMS 좌측 메타데이터 팔레트 — NCS + Global */
export async function GET() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const catalog = await loadDemoCatalogMetadata();
    return NextResponse.json(catalog);
  } catch (e) {
    console.error("[content/catalog GET]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("GlobalCompetency")) {
      return NextResponse.json(
        {
          error:
            "글로벌 역량사전 테이블이 없습니다. migrate deploy 후 npm run db:seed:global 을 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "카탈로그 조회 실패" }, { status: 500 });
  }
}
