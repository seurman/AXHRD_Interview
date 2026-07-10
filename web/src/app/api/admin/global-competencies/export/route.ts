import { NextResponse } from "next/server";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { buildGlobalDictionaryCaseExport } from "@/lib/competency/global-dictionary-export";

/** CASE JSON — 글로벌 역량사전 이식·백업 포맷 */
export async function GET(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  try {
    const payload = await buildGlobalDictionaryCaseExport();
    const body = JSON.stringify(payload, null, 2);

    if (download) {
      const stamp = payload.exportedAt.slice(0, 10);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="axhrd-global-dictionary-${stamp}.json"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error("[global-competencies/export]", e);
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
    return NextResponse.json({ error: "보내기 실패" }, { status: 500 });
  }
}
