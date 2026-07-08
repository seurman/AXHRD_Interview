import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";

export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage() {
  await requireSuperadmin("/admin/permissions");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Configure</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">권한 설정</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Greenhouse <em>Configure → Permissions</em> 및 HireVue <em>Admin → Roles</em> 패턴을
          따릅니다. 역할별로 접근 가능한 모듈(capability)을 확인하고, 사용자에게 역할을 부여하려면{" "}
          <Link href="/admin/users" className="text-accent hover:underline">
            사용자 권한
          </Link>
          으로 이동하세요.
        </p>
      </div>

      <PermissionMatrix />

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-card-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Greenhouse 참고</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
            <li>Site Admin — 전사 설정 (≈ 수퍼어드민)</li>
            <li>Job Admin — 채용별 권한 스트라이프 (≈ 기관 어드민)</li>
            <li>Basic — 제한된 뷰 (≈ 학생)</li>
            <li>User-specific permissions — 역할 위 추가 권한</li>
          </ul>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">HireVue 참고</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
            <li>Admin — 계정·통합·문항 세트</li>
            <li>Recruiter / Collaborator — 담당 포지션만</li>
            <li>Evaluator — 평가만</li>
            <li>SSO SAML 그룹 → 역할 매핑 (로드맵)</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
