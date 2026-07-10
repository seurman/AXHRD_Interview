import { requireDemoManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DemoWorkspaceList } from "@/components/admin/DemoWorkspaceList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminDemoPage() {
  await requireDemoManager("/admin/demo");

  const workspaces = await prisma.demoWorkspace.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      updatedAt: true,
      _count: { select: { competencies: true, questions: true } },
    },
  });

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title="고객 데모 페이지"
        subtitle="회사 어드민 전용 샌드박스입니다. 고객사 미팅에서 역량·질문·루브릭을 실시간으로 편집하며 솔루션을 시연할 수 있습니다. 운영 문항 뱅크와 완전히 분리됩니다."
      />
      <DemoWorkspaceList
        initialWorkspaces={workspaces.map((w) => ({
          ...w,
          updatedAt: w.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
