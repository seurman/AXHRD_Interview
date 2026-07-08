import { NextResponse } from "next/server";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { slug: raw } = await params;
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    slug = raw;
  }

  try {
    const snap = await loadDemoWorkspaceBySlug(slug);
    if (!snap) {
      return NextResponse.json(
        {
          error:
            "데모를 찾을 수 없습니다. 관리자에서 해당 데모를 연 뒤 미리보기 URL을 다시 열어 주세요.",
        },
        { status: 404 },
      );
    }

    const activeCompetencies = snap.competencies.filter((c) => c.isActive);
    const activeCompIds = new Set(activeCompetencies.map((c) => c.id));
    const activeQuestions = snap.questions.filter(
      (q) => q.isActive && activeCompIds.has(q.competencyId),
    );

    return NextResponse.json({
      workspace: snap.workspace,
      competencies: activeCompetencies,
      questions: activeQuestions,
    });
  } catch (e) {
    console.error("[api/demo GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "데모 조회 실패" },
      { status: 500 },
    );
  }
}
