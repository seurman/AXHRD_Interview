import { NextResponse } from "next/server";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const snap = await loadDemoWorkspaceBySlug(slug);
  if (!snap) {
    return NextResponse.json({ error: "데모를 찾을 수 없습니다." }, { status: 404 });
  }

  const activeCompetencies = snap.competencies.filter((c) => c.isActive);
  const activeCompIds = new Set(activeCompetencies.map((c) => c.id));
  const activeQuestions = snap.questions.filter(
    (q) => q.isActive && activeCompIds.has(q.competencyId)
  );

  return NextResponse.json({
    workspace: snap.workspace,
    competencies: activeCompetencies,
    questions: activeQuestions,
  });
}
