import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminPermissionsPage() {
  await requireSuperadmin("/admin/permissions");

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.security}
        title="권한 설정"
        subtitle={
          <>
            AXHRD 역할×모듈 매트릭스입니다. 페이지를 capability로 격리해 필요 모듈만 로드하고,
            사용자 역할 부여는{" "}
            <Link href="/admin/users" className="text-accent hover:underline">
              사용자 권한
            </Link>
            에서 합니다.
          </>
        }
      />

      <PermissionMatrix />

      <section className="card-luxe p-4">
        <h2 className="text-sm font-semibold text-foreground">AX 차별점</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
          <li>외부 ATS 역할명을 베끼지 않고, 제품 데이터 레이어(면접·역량·참여 현황)에 맞춘 6역할</li>
          <li>수퍼/회사 어드민은 사용량 면제 · 데모 샌드박스는 영업 데이터 격리</li>
          <li>학생·기관 권한은 개인 원문 비공개 원칙과 함께 설계</li>
        </ul>
      </section>
    </div>
  );
}
