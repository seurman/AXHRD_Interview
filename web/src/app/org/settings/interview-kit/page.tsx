import Link from "next/link";
import { InterviewKitBuilder } from "@/components/org/InterviewKitBuilder";
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
          + / − 버튼으로 역량·문항을 구성하고 L1~L5 루브릭을 조정합니다.
        </p>
      </div>

      <InterviewKitBuilder backHref="/org/settings" backLabel="면접 설정으로" />

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
