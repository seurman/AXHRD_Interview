"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type CatalogScenario = {
  id: string;
  code: string;
  kind: "ROLE_PLAY" | "IN_BASKET";
  titleKo: string;
  roleContext: string | null;
  durationMinutes: number;
  maxTurns: number;
  personaName: string | null;
  personaRole: string | null;
  itemCount: number;
  competencies: Array<{ code: string; nameKo: string }>;
};

export type CatalogAttempt = {
  id: string;
  scenarioId: string;
  status: "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "SCORED";
  createdAt: string;
  submittedAt: string | null;
  overallScore: number | null;
};

const KIND_LABEL: Record<CatalogScenario["kind"], string> = {
  ROLE_PLAY: "역할연기",
  IN_BASKET: "서류함",
};

export function AssessmentCatalog({
  scenarios,
  attempts,
}: {
  scenarios: CatalogScenario[];
  attempts: CatalogAttempt[];
}) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startScenario(scenarioId: string) {
    setStartingId(scenarioId);
    setError(null);
    try {
      const res = await fetch("/api/assessment/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      const data = (await res.json()) as { attemptId?: string; error?: string };
      if (!res.ok || !data.attemptId) {
        setError(data.error ?? "시작에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      router.push(`/assessment/attempt/${data.attemptId}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </p>
      ) : null}

      {scenarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card/30 px-4 py-6 text-sm text-muted sm:px-5 sm:py-8">
          <p className="font-medium text-foreground">게시된 과제가 아직 없습니다.</p>
          <p className="mt-2 leading-relaxed">
            플랫폼 관리자가 데모 과제(저성과 팀원 면담 · 신임 팀장 서류함)를 시드하거나
            과제를 업로드·게시한 뒤 이 목록에 표시됩니다.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {scenarios.map((s) => {
          const inProgress = attempts.find(
            (a) =>
              a.scenarioId === s.id &&
              (a.status === "DRAFT" || a.status === "IN_PROGRESS"),
          );
          return (
            <article key={s.id} className="card-luxe flex flex-col gap-4 p-4 sm:p-6">
              <div>
                <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-accent">
                  {KIND_LABEL[s.kind]}
                </span>
                <h2 className="mt-3 text-base font-semibold leading-snug text-foreground sm:text-lg">
                  {s.titleKo}
                </h2>
                {s.roleContext ? (
                  <p className="mt-1 text-sm text-muted">{s.roleContext}</p>
                ) : null}
              </div>

              <ul className="space-y-1 text-xs text-muted">
                <li>· 소요 시간 약 {s.durationMinutes}분</li>
                {s.kind === "ROLE_PLAY" ? (
                  <li>
                    · 상대역 {s.personaName ?? "-"}
                    {s.personaRole ? ` (${s.personaRole})` : ""} · 최대{" "}
                    {s.maxTurns}턴 대화
                  </li>
                ) : (
                  <li>· 처리할 문서 {s.itemCount}건</li>
                )}
                <li>
                  · 평가 역량: {s.competencies.map((c) => c.nameKo).join(", ")}
                </li>
              </ul>

              <div className="mt-auto">
                <button
                  type="button"
                  onClick={() => startScenario(s.id)}
                  disabled={startingId !== null}
                  className="min-h-11 w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                >
                  {startingId === s.id
                    ? "준비 중…"
                    : inProgress
                      ? "이어서 진행하기"
                      : "시작하기"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {attempts.length > 0 ? (
        <section className="card-luxe p-4 sm:p-6">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">내 응시 기록</h2>
          <ul className="mt-4 divide-y divide-card-border">
            {attempts.map((a) => {
              const scenario = scenarios.find((s) => s.id === a.scenarioId);
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {scenario?.titleKo ?? "삭제된 과제"}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(a.createdAt).toLocaleDateString("ko-KR")} ·{" "}
                      {a.status === "SCORED"
                        ? `평정 완료${a.overallScore != null ? ` · ${a.overallScore.toFixed(2)}/5` : ""}`
                        : a.status === "SUBMITTED"
                          ? "채점 대기"
                          : "진행 중"}
                    </p>
                  </div>
                  {a.status === "SCORED" || a.status === "SUBMITTED" ? (
                    <Link
                      href={`/assessment/attempt/${a.id}/report`}
                      className="min-h-10 inline-flex items-center text-sm text-accent hover:underline"
                    >
                      리포트 보기 →
                    </Link>
                  ) : (
                    <Link
                      href={`/assessment/attempt/${a.id}`}
                      className="min-h-10 inline-flex items-center text-sm text-accent hover:underline"
                    >
                      이어서 진행 →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
