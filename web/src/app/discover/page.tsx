import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { DiscoverStartButton } from "@/components/discover/DiscoverStartButton";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          Self-Discovery Interview
        </p>
        <h1 className="text-3xl font-bold text-foreground">나를 발견하기</h1>
        <p className="text-muted">
          AI와의 성찰 대화를 통해 스스로 강점·가치관·이야기의 주제를 발견해 보세요.
        </p>
      </header>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">이것은 면접 평가가 아닙니다</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>• 채점·등급·합격/불합격이 전혀 없습니다</li>
          <li>• 정답 없이, 실제 있었던 경험을 이야기 형식으로 나눕니다</li>
          <li>• 약 9개의 질문에 답하면, 당신만의 발견 리포트를 받습니다</li>
          <li>• 심리 진단·채용 결정 도구가 아닌, 자기이해를 돕는 성찰 도구입니다</li>
        </ul>
      </section>

      <section className="card-luxe space-y-3 p-6">
        <h2 className="font-semibold text-foreground">어떤 방법론을 바탕으로 하나요?</h2>
        <p className="text-sm text-muted leading-relaxed">
          BEI(행동사건면접)의 &ldquo;구체적 사건 서술&rdquo; 철학, McAdams의 Life Story
          Interview(인생 챕터·전환점), Reflected Best Self Exercise(가장 나다웠던 순간)를
          조합했습니다. 결과는 VIA 성격강점·Schwartz 가치관 체계로 정리되며, 기존 역량
          트래킹과 연결되는 신호도 함께 보여 드립니다.
        </p>
      </section>

      {user ? (
        <DiscoverStartButton />
      ) : (
        <div className="text-center">
          <Link
            href="/auth/login?next=/discover"
            className="inline-block rounded-xl bg-primary px-8 py-3 font-medium text-white hover:opacity-90"
          >
            로그인하고 시작하기
          </Link>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        질문 진행 중에는 AI 호출이 없고, 모든 답변 후 리포트 생성 시 1회만 분석합니다.
      </p>
    </div>
  );
}
