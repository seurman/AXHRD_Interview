import Link from "next/link";
import { requireContentConsoleViewer } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CompetencyGameOpsPanel } from "@/components/admin/CompetencyGameOpsPanel";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminCompetencyGameOpsPage() {
  await requireContentConsoleViewer("/admin/content/game");

  return (
    <div className={ADMIN_CONTAINER.wide}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title="역량게임 운영"
        subtitle={
          <>
            상황 판단 · 의도 독해 · 베스트/워스트 등 레벨을 운영에 넣고 빼는 스위치입니다. 플레이어
            패스(`/practice/game`)에 즉시 반영됩니다.
          </>
        }
        backHref="/admin/content"
        backLabel="Framework Studio"
        links={[
          { href: "/practice/game", label: "플레이어 화면 →" },
          { href: "/admin/content?view=lexicon", label: "역량사전 →" },
          { href: "/admin/audit", label: "감사 로그 →" },
        ]}
      />

      <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-muted">
        신규 레벨(의도 독해·베스트/워스트)은 기본 <strong className="text-foreground">활성</strong>
        입니다. 배포 후 이 페이지에서 타입/레벨을 끄면 숨겨집니다.{" "}
        <Link href="/admin/content" className="text-accent hover:underline">
          Framework Studio
        </Link>
        의 역량사전 동기화와는 별개입니다.
      </div>

      <CompetencyGameOpsPanel />
    </div>
  );
}
