import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FeatureFlagsPanel } from "@/components/admin/FeatureFlagsPanel";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { getAllFeatureFlags } from "@/lib/platform/feature-flags";

export const dynamic = "force-dynamic";

export default async function FeatureFlagsPage() {
  await requireSuperadmin("/admin/settings/features");
  const flags = await getAllFeatureFlags();

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.security}
        title="세션 옵션 기능 설정"
        subtitle={
          <>
            지원자 SetupForm의 세션 옵션을 플랫폼 전역에서 켜고 끕니다. 비활성화 시 체크박스가
            숨겨지고,{" "}
            <code className="text-xs">/api/interview/start</code> 직접 호출도 서버에서 무시됩니다.
          </>
        }
        backHref="/admin"
        backLabel="관리자 홈"
        links={[
          { href: "/admin/audit", label: "감사 로그 →" },
          { href: "/admin/content", label: "Framework Studio →" },
        ]}
      />

      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted">
        슈퍼어드민 전용입니다. 기관 entitlement와 별개로, 플랫폼 전체에 적용되는 킬스위치입니다.
      </div>

      <FeatureFlagsPanel
        flags={flags.map((f) => ({
          key: f.key,
          label: f.label,
          description: f.description,
          enabled: f.enabled,
        }))}
      />

      <p className="mt-6 text-xs text-muted">
        변경 내역은{" "}
        <Link href="/admin/audit" className="text-accent hover:underline">
          감사 로그
        </Link>
        에 기록됩니다.
      </p>
    </div>
  );
}
