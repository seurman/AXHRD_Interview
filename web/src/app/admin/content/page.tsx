import Link from "next/link";
import { requirePlatformAdmin, hasSuperadminAccess } from "@/lib/auth/guards";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { ContentBankEditor } from "@/components/admin/ContentBankEditor";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await requirePlatformAdmin("/admin/content");
  const { competencies, questions } = await loadContentBankSnapshot();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">문항 뱅크 · 역량 · 루브릭</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          HireVue Builder처럼 역량을 정의하고, 레벨별 문항을 드래그로 배치·이동하며,
          문항별 채점 루브릭을 미리 설정합니다. ADMIN은 삭제 대신 비활성화만 가능하며,
          모든 변경은 SUPERADMIN 감사 로그에 기록됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/org/saas/settings/interview-kit" className="text-accent hover:underline">
            기관 인터뷰 킷 빌더 →
          </Link>
          {hasSuperadminAccess(user) && (
            <>
              <Link href="/admin/users" className="text-accent hover:underline">
                ADMIN 권한 부여 →
              </Link>
              <Link href="/admin/audit" className="text-accent hover:underline">
                감사 로그 · 롤백 →
              </Link>
              <Link href="/admin/organizations" className="text-accent hover:underline">
                기관 승인 관리 →
              </Link>
            </>
          )}
        </div>
      </div>

      <ContentBankEditor
        initialCompetencies={competencies}
        initialQuestions={questions}
        canManagePermissions={hasSuperadminAccess(user)}
      />
    </div>
  );
}
