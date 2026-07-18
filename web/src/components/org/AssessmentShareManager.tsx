"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ScenarioOption = {
  id: string;
  kind: "ROLE_PLAY" | "IN_BASKET";
  titleKo: string;
  roleContext: string | null;
  durationMinutes: number;
  competencyNames: string[];
};

type ShareAttempt = {
  id: string;
  status: "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "SCORED";
  submittedAt: string | null;
  userName: string;
  userEmail: string;
  overallScore: number | null;
};

type ShareRow = {
  id: string;
  slug: string;
  label: string;
  isActive: boolean;
  expiresAt: string | null;
  scenarioTitle: string;
  scenarioKind: "ROLE_PLAY" | "IN_BASKET";
  attempts: ShareAttempt[];
};

const KIND_LABEL = { ROLE_PLAY: "역할연기", IN_BASKET: "서류함" } as const;

export function AssessmentShareManager({
  scenarios,
  initialShares,
}: {
  scenarios: ScenarioOption[];
  initialShares: ShareRow[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openShareId, setOpenShareId] = useState<string | null>(null);

  async function createShare() {
    if (creating) return;
    if (!label.trim()) {
      setError("캠페인 이름을 입력해 주세요.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/org/assessment-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, label: label.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "생성에 실패했습니다.");
        return;
      }
      setLabel("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleShare(id: string, isActive: boolean) {
    try {
      await fetch(`/api/org/assessment-shares/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } catch {
      setError("변경에 실패했습니다.");
    }
  }

  async function copyLink(share: ShareRow) {
    const url = `${window.location.origin}/a/${share.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("아래 링크를 복사하세요:", url);
    }
  }

  return (
    <div className="space-y-8">
      {/* 새 배포 링크 */}
      <section className="card-luxe space-y-4 p-6">
        <h2 className="text-lg font-semibold text-foreground">새 배포 링크 만들기</h2>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm text-foreground"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                [{KIND_LABEL[s.kind]}] {s.titleKo}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='캠페인 이름 — 예: "2026 하반기 팀장 승진 후보"'
            maxLength={80}
            className="rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => void createShare()}
            disabled={creating || scenarios.length === 0}
            className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "생성 중…" : "링크 생성"}
          </button>
        </div>
        {error ? <p className="text-sm text-warning">{error}</p> : null}
        {scenarioId ? (
          <p className="text-xs text-muted">
            {(() => {
              const s = scenarios.find((x) => x.id === scenarioId);
              if (!s) return null;
              return `약 ${s.durationMinutes}분 · 평가 역량: ${s.competencyNames.join(", ")}`;
            })()}
          </p>
        ) : null}
      </section>

      {/* 배포 링크 목록 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">배포 중인 링크</h2>
        {initialShares.length === 0 ? (
          <p className="card-luxe p-6 text-sm text-muted">
            아직 배포 링크가 없습니다. 위에서 첫 링크를 만들어 보세요.
          </p>
        ) : (
          initialShares.map((share) => {
            const scored = share.attempts.filter((a) => a.status === "SCORED");
            const open = openShareId === share.id;
            return (
              <article key={share.id} className="card-luxe p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{share.label}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          share.isActive
                            ? "bg-success/10 text-success"
                            : "bg-card text-muted"
                        }`}
                      >
                        {share.isActive ? "활성" : "중지됨"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      [{KIND_LABEL[share.scenarioKind]}] {share.scenarioTitle} · 응시{" "}
                      {share.attempts.length}명 · 평정 완료 {scored.length}명
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => void copyLink(share)}
                      className="rounded-lg border border-card-border px-3 py-1.5 text-xs text-foreground transition hover:bg-card"
                    >
                      {copiedId === share.id ? "복사됨 ✓" : "링크 복사"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleShare(share.id, share.isActive)}
                      className="rounded-lg border border-card-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                    >
                      {share.isActive ? "중지" : "재개"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenShareId(open ? null : share.id)}
                      className="rounded-lg border border-card-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                    >
                      {open ? "접기 ▲" : "응시자 보기 ▼"}
                    </button>
                  </div>
                </div>

                {open ? (
                  share.attempts.length === 0 ? (
                    <p className="mt-4 border-t border-card-border pt-4 text-sm text-muted">
                      아직 응시자가 없습니다.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-card-border border-t border-card-border">
                      {share.attempts.map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {a.userName}{" "}
                              <span className="text-xs font-normal text-muted">
                                {a.userEmail}
                              </span>
                            </p>
                            <p className="text-xs text-muted">
                              {a.status === "SCORED"
                                ? `평정 완료 · ${a.overallScore != null ? `${a.overallScore.toFixed(2)}/5` : "-"}`
                                : a.status === "SUBMITTED"
                                  ? "제출됨 · 채점 대기"
                                  : "진행 중"}
                              {a.submittedAt
                                ? ` · ${new Date(a.submittedAt).toLocaleDateString("ko-KR")}`
                                : ""}
                            </p>
                          </div>
                          {a.status === "SCORED" ? (
                            <Link
                              href={`/org/assessment/attempts/${a.id}`}
                              className="text-xs text-accent hover:underline"
                            >
                              리포트 보기 →
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
