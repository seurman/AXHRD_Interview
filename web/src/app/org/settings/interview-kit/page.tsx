import Link from "next/link";
import { requireOrgAdmin } from "@/lib/auth/guards";
import { canUseInterviewKitBuilder } from "@/lib/org/interview-kit";
import { InterviewKitBuilder } from "@/components/org/InterviewKitBuilder";

export const dynamic = "force-dynamic";

export default async function OrgInterviewKitPage() {
  const user = await requireOrgAdmin("/org/settings/interview-kit");
  const access = await canUseInterviewKitBuilder(user);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          B2B · Interview Kit Builder
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">인터뷰 킷 빌더</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          플랫폼 문항 뱅크에서 우리 기관이 사용할 문항을 고르고 순서를 정하며, 역량별
          채점 루브릭 강조점을 조정합니다. IRT 난이도 파라미터는 변경되지 않으며, 설정하지
          않은 역량은 플랫폼 기본값으로 면접이 진행됩니다.
        </p>
        {!access.allowed && access.reason === "plan_required" && (
          <div className="mt-4 rounded-lg border border-gold/40 bg-gold/5 p-4 text-sm">
            ORG_STANDARD 또는 ORG_ENTERPRISE 플랜 구독 후 이용할 수 있습니다.{" "}
            <Link href="/pricing" className="text-accent hover:underline">
              요금제 보기
            </Link>
          </div>
        )}
      </div>

      {access.allowed ? (
        <InterviewKitBuilder />
      ) : access.reason === "plan_required" ? (
        <div className="card-luxe p-6 text-sm text-muted">
          플랜 업그레이드 후 이 화면에서 인터뷰 킷을 구성할 수 있습니다.
        </div>
      ) : null}

      <p className="text-center text-xs text-muted">
        <Link href="/org/dashboard" className="text-accent hover:underline">
          코호트 대시보드로 돌아가기
        </Link>
      </p>
    </div>
  );
}
