import Link from "next/link";
import { requireContentConsoleViewer, hasSuperadminAccess } from "@/lib/auth/guards";
import { isBusinessAdminUser } from "@/lib/auth/platform-ops";
import { canAccessProductionContentBank } from "@/lib/auth/roles";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResumeReviewCriteriaPanel } from "@/components/admin/ResumeReviewCriteriaPanel";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { loadAllReviewCriteria } from "@/lib/interview/resume-review-criteria";

export const dynamic = "force-dynamic";

export default async function AdminResumeReviewCriteriaPage() {
  const user = await requireContentConsoleViewer("/admin/content/resume-review");
  const canEdit =
    canAccessProductionContentBank(user) || hasSuperadminAccess(user);
  const readOnly = isBusinessAdminUser(user) && !canEdit;

  const criteria = await loadAllReviewCriteria();

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title="자소서 첨삭 기준"
        subtitle={
          <>
            자소서가 갖춰야 할 형식·논리, 산업 역량, STAR·BEI 기준을 관리합니다. 첨삭 리포트는
            요약이 아니라 이 기준 대비 강점·부족·수정안을 출력합니다.
          </>
        }
        backHref="/admin/content"
        backLabel="콘텐츠 콘솔"
        links={[
          { href: "/resume-review", label: "첨삭 화면 →" },
          { href: "/admin/audit", label: "감사 로그 →" },
        ]}
      />

      {readOnly && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted">
          조회 전용입니다. 추가·수정·삭제는 콘텐츠 운영 권한이 필요합니다.
        </div>
      )}

      <ResumeReviewCriteriaPanel initialCriteria={criteria} readOnly={readOnly} />

      <p className="mt-6 text-xs text-muted">
        변경은{" "}
        <Link href="/admin/audit" className="text-accent hover:underline">
          감사 로그
        </Link>
        에 기록됩니다. 시드 출처는 각 기준의「출처·메모」에 저장되어 있습니다.
      </p>
    </div>
  );
}
