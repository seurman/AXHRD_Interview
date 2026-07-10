import Link from "next/link";
import { requireProductionContentAdmin, hasSuperadminAccess } from "@/lib/auth/guards";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { AdminContentTabs } from "@/components/admin/AdminContentTabs";
import { MeaningLayerPanel } from "@/components/admin/MeaningLayerPanel";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await requireProductionContentAdmin("/admin/content");

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
    <div className="mx-auto max-w-7xl space-y-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">통합 역량 풀 · IRT 문항 뱅크</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          NCS·글로벌·신규 역량을 하나의 풀에서 관리합니다. 출처(source)만 다르고 모두 IRT 면접에
          사용됩니다. 좌측 역량군(클러스터)별로 역량·문항·루브릭을 편집하세요. 기관 킷 조립은{" "}
          <Link href="/org/settings/interview-kit" className="text-accent hover:underline">
            인터뷰 킷 스튜디오
          </Link>
          에서 합니다. 운영 DB에 글로벌 역량이 없으면{" "}
          <code className="text-xs">npx tsx scripts/sync-unified-bank.ts</code> 를 실행하세요.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/organizations" className="text-accent hover:underline">
            기관 관리 · 테넌트 허브 →
          </Link>
          <Link href="/admin/repository" className="text-accent hover:underline">
            역량 뱅크 →
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
        />
      )}

      <MeaningLayerPanel />
    </div>
  );
}
