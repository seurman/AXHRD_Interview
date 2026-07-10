import { notFound } from "next/navigation";
import { requireDemoManager } from "@/lib/auth/guards";
import { loadDemoWorkspaceSnapshot } from "@/lib/demo/workspace";
import { DemoWorkspaceEditor } from "@/components/admin/DemoWorkspaceEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDemoEditPage({ params }: Props) {
  await requireDemoManager("/admin/demo");
  const { id } = await params;
  const snap = await loadDemoWorkspaceSnapshot(id);
  if (!snap) notFound();

  return (
    <div className={ADMIN_CONTAINER.editor}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title={snap.workspace.name}
        backHref="/admin/demo"
        backLabel="데모 목록"
        subtitle={
          <>
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
          </>
        }
      />
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
