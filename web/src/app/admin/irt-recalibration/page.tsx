import { requireContentConsoleViewer, hasSuperadminAccess } from "@/lib/auth/guards";
import { isBusinessAdminUser } from "@/lib/auth/platform-ops";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { IrtRecalibrationPanel } from "@/components/admin/IrtRecalibrationPanel";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { IRT_RECAL_MIN_SAMPLE } from "@/lib/admin/irt-recalibration";

export const dynamic = "force-dynamic";

export default async function AdminIrtRecalibrationPage() {
  const user = await requireContentConsoleViewer("/admin/irt-recalibration");
  const readOnly = isBusinessAdminUser(user) && !hasSuperadminAccess(user);

  return (
    <div className={ADMIN_CONTAINER.wide}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title="IRT 문항 재보정"
        subtitle={`실측 ResponseRecord + CompetencySnapshot.theta로 문항 difficulty(b)·discrimination(a)를 2PL MLE로 재추정합니다. 표본 ${IRT_RECAL_MIN_SAMPLE}건 미만 문항은 건너뜁니다. 기본은 드라이런만 수행합니다.`}
        backHref="/admin/content"
        backLabel="Framework Studio"
        links={[
          { href: "/admin/data-storage", label: "데이터 저장 검증 →" },
          { href: "/admin/audit", label: "감사 로그 →" },
        ]}
      />

      {readOnly && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-muted">
          조회 전용 — 재보정 적용은 콘텐츠 관리자 또는 수퍼어드민만 가능합니다.
        </p>
      )}

      <AdminSection
        title="재보정 실행"
        description="드라이런으로 결과를 확인한 뒤, 검토 후에만 DB에 반영하세요. Python IRT 엔진은 수정하지 않으며, 다음 세션부터 갱신된 파라미터가 자동 반영됩니다."
      >
        <IrtRecalibrationPanel readOnly={readOnly} />
      </AdminSection>
    </div>
  );
}
