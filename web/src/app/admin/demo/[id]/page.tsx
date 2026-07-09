import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDemoManager } from "@/lib/auth/guards";
import { loadDemoWorkspaceSnapshot } from "@/lib/demo/workspace";
import { DemoWorkspaceEditor } from "@/components/admin/DemoWorkspaceEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDemoEditPage({ params }: Props) {
  await requireDemoManager("/admin/demo");
  const { id } = await params;
  const snap = await loadDemoWorkspaceSnapshot(id);
  if (!snap) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link href="/admin/demo" className="text-xs text-accent hover:underline">
          ← 데모 목록
        </Link>
        <h1 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{snap.workspace.name}</h1>
        <p className="mt-1 text-sm text-muted">
          공개 URL:{" "}
          <a
            href={`/demo/${encodeURIComponent(snap.workspace.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            <code className="text-xs">/demo/{snap.workspace.slug}</code>
          </a>
          {" · "}
          좌측 메타(NCS 6 + Global 20)에서 역량을 끌어와 키트를 구성한 뒤, 질의·루브릭 순으로
          조정하고 「데모 미리보기」에서 면접하기를 실행하세요.
        </p>
      </div>
      <DemoWorkspaceEditor
        key={snap.workspace.id}
        workspaceId={snap.workspace.id}
        workspaceSlug={snap.workspace.slug}
        initialCompetencies={snap.competencies}
        initialQuestions={snap.questions}
      />
    </div>
  );
}
