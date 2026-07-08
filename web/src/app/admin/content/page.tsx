import Link from "next/link";
import { requireProductionContentAdmin, hasSuperadminAccess } from "@/lib/auth/guards";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { ContentBankEditor } from "@/components/admin/ContentBankEditor";
import { GlobalCompetencyDictionaryPanel } from "@/components/admin/GlobalCompetencyDictionaryPanel";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await requireProductionContentAdmin("/admin/content");
  const { competencies, questions } = await loadContentBankSnapshot();

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">문항 뱅크 · 역량 · 루브릭</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          운영 문항 뱅크 CMS입니다. 수퍼어드민·콘텐츠 관리자만 편집할 수 있으며, 고객 미팅용
          데모는{" "}
          <Link href="/admin/demo" className="text-accent hover:underline">
            고객 데모
          </Link>
          메뉴에서 별도로 관리합니다. 하단의 글로벌 역량사전은 IRT NCS 6역량과 분리된
          자기평가/360용 콘텐츠입니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/organizations" className="text-accent hover:underline">
            기관 관리 · 테넌트 허브 →
          </Link>
          {hasSuperadminAccess(user) && (
            <>
              <Link href="/admin/users" className="text-accent hover:underline">
                ADMIN 권한 부여 →
              </Link>
              <Link href="/admin/audit" className="text-accent hover:underline">
                감사 로그 · 롤백 →
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

      <GlobalCompetencyDictionaryPanel />
    </div>
  );
}
