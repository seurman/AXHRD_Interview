import Link from "next/link";
import { InterviewKitBuilder } from "@/components/org/InterviewKitBuilder";
import { KitShareManager } from "@/components/org/KitShareManager";
import { requireInterviewKitUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function OrgInterviewKitPage() {
  await requireInterviewKitUser("/org/settings/interview-kit");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">기관 · 면접 설정</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">인터뷰 킷</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          고객 데모와 같은 흐름입니다. 좌측 메타(역량 사전)에서 필요 역량을 고르고, 질의·루브릭을
          조정한 뒤 공유 링크로 실행하세요.
        </p>
      </div>

      <InterviewKitBuilder backHref="/org/settings" backLabel="면접 설정으로" />

      <KitShareManager />

      <p className="text-center text-xs text-muted">
        <Link href="/org/settings" className="text-accent hover:underline">
          면접 설정
        </Link>
        {" · "}
        <Link href="/org/dashboard" className="text-accent hover:underline">
          코호트 대시보드
        </Link>
      </p>
    </div>
  );
}
