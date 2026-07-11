import { NextResponse } from "next/server";
import { requireProductionContentAdmin } from "@/lib/auth/guards";
import { syncNcsCompetencyBank } from "@/lib/competency/ncs-bank-sync";

export async function POST() {
  await requireProductionContentAdmin("/admin/content");

  try {
    const result = await syncNcsCompetencyBank();
    return NextResponse.json({
      ok: true,
      message: `NCS 역량 ${result.competencies}개 · 문항 ${result.questions}개 동기화 완료`,
      ...result,
    });
  } catch (e) {
    console.error("[content/ncs-sync]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "NCS 동기화 실패" },
      { status: 500 },
    );
  }
}
