import Link from "next/link";
import { requireProductionContentAdmin, hasSuperadminAccess } from "@/lib/auth/guards";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { ContentMetadataStudio } from "@/components/admin/ContentMetadataStudio";
import { GlobalCompetencyDictionaryPanel } from "@/components/admin/GlobalCompetencyDictionaryPanel";
import { MeaningLayerPanel } from "@/components/admin/MeaningLayerPanel";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await requireProductionContentAdmin("/admin/content");
  const { competencies, questions } = await loadContentBankSnapshot();

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">문항 뱅크 · 메타데이터 CMS</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          플랫폼 운영 문항 뱅크의 역량·문항·루브릭 메타데이터를 생성·수정·매핑하는 곳입니다. 기관별 면접 킷
          조립(역량 선택·문항 매핑)은{" "}
          <Link href="/org/settings/interview-kit" className="text-accent hover:underline">
            기관 인터뷰 킷
          </Link>
          에서 진행합니다. 영업용 격리 데모는{" "}
          <Link href="/admin/demo" className="text-accent hover:underline">
            고객 데모
          </Link>
          메뉴입니다. 하단 글로벌 역량사전·Meaning Layer는 IRT NCS 6과 분리된 온톨로지 층입니다.
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

      <ContentMetadataStudio initialCompetencies={competencies} initialQuestions={questions} />

      <GlobalCompetencyDictionaryPanel />

      <MeaningLayerPanel />
    </div>
  );
}
