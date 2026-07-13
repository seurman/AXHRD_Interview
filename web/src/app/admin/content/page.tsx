import Link from "next/link";
import { requireContentConsoleViewer, hasSuperadminAccess } from "@/lib/auth/guards";
import { isBusinessAdminUser } from "@/lib/auth/platform-ops";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { AdminContentTabs, type ContentStudioView } from "@/components/admin/AdminContentTabs";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import type { FrameworkWorkspaceTab } from "@/components/admin/framework/FrameworkCompetencyWorkspace";

export const dynamic = "force-dynamic";

const VALID_TABS = new Set<FrameworkWorkspaceTab>([
  "meta",
  "levels",
  "questions",
  "rubrics",
  "quality",
]);

const VALID_VIEWS = new Set<ContentStudioView>([
  "platform",
  "ncs",
  "global_source",
  "alignment",
  "org_custom",
]);

type Props = {
  searchParams: Promise<{ competency?: string; tab?: string; view?: string }>;
};

export default async function AdminContentPage({ searchParams }: Props) {
  const user = await requireContentConsoleViewer("/admin/content");
  const readOnlyConsole = isBusinessAdminUser(user) && !hasSuperadminAccess(user);
  const params = await searchParams;
  const initialCompetencyCode = params.competency?.trim() || null;
  const tabParam = params.tab?.trim();
  const initialTab =
    tabParam && VALID_TABS.has(tabParam as FrameworkWorkspaceTab)
      ? (tabParam as FrameworkWorkspaceTab)
      : null;
  const viewParam = params.view?.trim();
  const initialView =
    viewParam && VALID_VIEWS.has(viewParam as ContentStudioView)
      ? (viewParam as ContentStudioView)
      : null;

  let clusters: Awaited<ReturnType<typeof loadContentBankSnapshot>>["clusters"] = [];
  let competencies: Awaited<ReturnType<typeof loadContentBankSnapshot>>["competencies"] = [];
  let questions: Awaited<ReturnType<typeof loadContentBankSnapshot>>["questions"] = [];
  let loadError: string | null = null;

  try {
    const snapshot = await loadContentBankSnapshot();
    clusters = snapshot.clusters;
    competencies = snapshot.competencies;
    questions = snapshot.questions;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "문항 뱅크를 불러오지 못했습니다.";
  }

  return (
    <div className={ADMIN_CONTAINER.wide}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title="Framework Studio"
        subtitle={
          <>
            역량군 → 역량 → 문항(IRT) · 루브릭 · 품질을 한 워크스페이스에서 관리합니다. NCS 6+4역량은
            「NCS 역량」 탭, 글로벌 20역량은 「글로벌 사전」 탭에서 동기화하세요. 기관 킷 조립은{" "}
            <Link href="/org/settings/interview-kit" className="text-accent hover:underline">
              인터뷰 킷 스튜디오
            </Link>
            에서 합니다.
          </>
        }
        links={[
          { href: "/admin/irt-recalibration", label: "IRT 재보정 →" },
          { href: "/admin/organizations", label: "기관 관리 · 테넌트 허브 →" },
          ...(hasSuperadminAccess(user)
            ? [
                { href: "/admin/users", label: "ADMIN 권한 부여 →" },
                { href: "/admin/audit", label: "감사 로그 · 롤백 →" },
              ]
            : []),
        ]}
      />

      {readOnlyConsole && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-muted">
          조회 전용 모드 — 콘텐츠 변경·동기화는 콘텐츠 관리자 또는 수퍼어드민만 가능합니다.
        </p>
      )}

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold">문항 뱅크를 불러올 수 없습니다</p>
          <p className="mt-2 whitespace-pre-wrap">{loadError}</p>
          <p className="mt-3 text-muted">
            로컬: dev 서버 재시작 후{" "}
            <code className="text-xs">npx prisma migrate deploy</code> ·{" "}
            <code className="text-xs">npx tsx scripts/sync-unified-bank.ts</code>
          </p>
        </div>
      ) : (
        <AdminContentTabs
          initialClusters={clusters}
          initialCompetencies={competencies}
          initialQuestions={questions}
          initialCompetencyCode={initialCompetencyCode}
          initialTab={initialTab}
          initialView={initialView}
        />
      )}
    </div>
  );
}
