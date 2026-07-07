import Link from "next/link";
import { InterviewKitBuilder } from "@/components/org/InterviewKitBuilder";
import { requireInterviewKitUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function OrgInterviewKitPage() {
  await requireInterviewKitUser("/org/saas/settings/interview-kit");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          SaaS · Settings · Interview Kit
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">인터뷰 킷 빌더</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          관리자 문항 뱅크와 동일한 데이터를 사용합니다. 플랫폼에서 큐레이션한 문항을
          고르고 순서를 정하며, 역량별 채점 루브릭 강조점을 조정합니다. IRT 난이도
          파라미터는 변경되지 않으며, 설정하지 않은 역량은 플랫폼 기본값으로 면접이
          진행됩니다.
        </p>
      </div>

      <InterviewKitBuilder />

      <p className="text-center text-xs text-muted">
        <Link href="/org/saas/settings" className="text-accent hover:underline">
          기관 설정으로 돌아가기
        </Link>
        {" · "}
        <Link href="/org/dashboard" className="text-accent hover:underline">
          코호트 대시보드
        </Link>
        {" · "}
        <Link href="/admin/content" className="text-accent hover:underline">
          문항 뱅크 관리
        </Link>
      </p>
    </div>
  );
}
