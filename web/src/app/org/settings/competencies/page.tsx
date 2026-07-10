import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { resolveOrgContentAccess } from "@/lib/content/org-access";
import { OrgCompetencyManager } from "@/components/org/OrgCompetencyManager";

export const dynamic = "force-dynamic";

export default async function OrgCompetenciesSettingsPage() {
  const user = await requirePageUser("/org/settings/competencies");
  const access = await resolveOrgContentAccess(user);

  if (!access.allowed) {
    const msg =
      access.reason === "not_enabled"
        ? "면접 맞춤 설정이 활성화되지 않았습니다."
        : access.reason === "read_only"
          ? "조회 권한이 없습니다."
          : "기관 ADMIN 권한이 필요합니다.";
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted">{msg}</p>
        <Link href="/org/settings" className="text-sm text-accent hover:underline">
          기관 설정으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/org/settings" className="text-xs text-accent hover:underline">
          ← 기관 설정
        </Link>
        <h1 className="mt-2 text-2xl font-bold">역량 관리</h1>
        <p className="mt-1 text-sm text-muted">{access.organizationName}</p>
      </div>
      <OrgCompetencyManager />
    </div>
  );
}
