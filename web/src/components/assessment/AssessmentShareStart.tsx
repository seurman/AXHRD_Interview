"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicAssessmentShare } from "@/lib/org/assessment-share";

/** 배포 링크 랜딩 — 로그인 안 됐으면 로그인으로, 됐으면 시도 생성 후 실행 화면으로 */
export function AssessmentShareStart({ share }: { share: PublicAssessmentShare }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kindLabel = share.scenario.kind === "IN_BASKET" ? "서류함" : "역할연기";

  async function start() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/assessment/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareSlug: share.slug }),
      });
      if (res.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(`/a/${share.slug}`)}`);
        return;
      }
      const data = (await res.json()) as { attemptId?: string; error?: string };
      if (!res.ok || !data.attemptId) {
        setError(data.error ?? "시작에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      router.push(`/assessment/attempt/${data.attemptId}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="card-luxe space-y-6 p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
          {share.organizationName}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{share.label}</h1>
        <p className="mt-1 text-sm text-muted">
          {kindLabel} 과제 · {share.scenario.titleKo}
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-muted">
        {share.scenario.roleContext ? <li>· 역할: {share.scenario.roleContext}</li> : null}
        <li>· 소요 시간 약 {share.scenario.durationMinutes}분</li>
        {share.scenario.kind === "IN_BASKET" ? (
          <li>· 처리할 문서 {share.scenario.itemCount}건</li>
        ) : (
          <li>· 상대역과 최대 {share.scenario.maxTurns}턴 대화</li>
        )}
        <li>
          · 평가 역량: {share.scenario.competencies.map((c) => c.nameKo).join(", ")}
        </li>
      </ul>

      <p className="rounded-xl bg-card px-4 py-3 text-xs leading-relaxed text-muted">
        응시를 시작하면 수행 내용과 평가 결과가 이 과제를 배포한 기관(
        {share.organizationName})에 공유됩니다. 결과는 관찰된 행동 근거 기반의
        1–5 평정 리포트로 생성됩니다.
      </p>

      {error ? <p className="text-sm text-warning">{error}</p> : null}

      <button
        type="button"
        onClick={() => void start()}
        disabled={starting}
        className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {starting ? "준비 중…" : "응시 시작하기 (로그인 필요)"}
      </button>
    </div>
  );
}
