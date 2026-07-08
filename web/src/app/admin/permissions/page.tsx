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
          AXHRD 역할×모듈 매트릭스입니다. 페이지를 capability로 격리해 필요 모듈만 로드하고,
          사용자 역할 부여는{" "}
          <Link href="/admin/users" className="text-accent hover:underline">
            사용자 권한
          </Link>
          에서 합니다.
        </p>
      </div>

      <PermissionMatrix />

      <section className="rounded-xl border border-card-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">AX 차별점</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
          <li>외부 ATS 역할명을 베끼지 않고, 제품 데이터 레이어(면접·역량·코호트)에 맞춘 6역할</li>
          <li>수퍼/회사 어드민은 사용량 면제 · 데모 샌드박스는 영업 데이터 격리</li>
          <li>학생·기관 권한은 개인 원문 비공개 원칙과 함께 설계</li>
        </ul>
      </section>
    </div>
  );
}
