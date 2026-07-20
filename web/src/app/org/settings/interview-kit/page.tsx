import Link from "next/link";
import { OrgKitStudioEditor } from "@/components/admin/OrgKitStudioEditor";
import { KitShareManager } from "@/components/org/KitShareManager";
import { requireInterviewKitUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function OrgInterviewKitPage() {
  await requireInterviewKitUser("/org/settings/interview-kit");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">기관 · 면접 설정</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">기관 인터뷰 킷</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          플랫폼 문항 뱅크에서 역량·문항을 골라 기관 면접 킷을 조립합니다. 역량 추가 → 문항 매핑 → 루브릭
          조정 후 공유 링크로 실행하세요. 문항·역량 메타데이터 편집은 플랫폼 관리자의 문항 뱅크에서 합니다.
        </p>
      </div>

      <OrgKitStudioEditor backHref="/org/settings" backLabel="면접·역량 설정으로" />

      <KitShareManager />

      <p className="text-center text-xs text-muted">
        <Link href="/org/settings" className="text-accent hover:underline">
          면접·역량 설정
        </Link>
        {" · "}
        <Link href="/org/dashboard" className="text-accent hover:underline">
          참여 현황
        </Link>
      </p>
    </div>
  );
}
