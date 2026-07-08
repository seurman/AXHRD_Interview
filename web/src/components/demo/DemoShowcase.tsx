"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DemoCompetencyDto, DemoQuestionDto } from "@/lib/demo/workspace";
import { JOB_ROLES } from "@/types";
import { jobRoleLabel } from "@/lib/labels";

type Props = {
  slug: string;
  /** 서버에서 이미 로드한 스냅샷 — API 재조회 실패해도 미리보기 가능 */
  initialSnap?: Snap | null;
};

type Snap = {
  workspace: { name: string; description: string | null; slug?: string };
  competencies: DemoCompetencyDto[];
  questions: DemoQuestionDto[];
};

const LEVELS = [1, 2, 3, 4, 5] as const;

export function DemoShowcase({ slug, initialSnap = null }: Props) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snap | null>(initialSnap);
  const [selectedId, setSelectedId] = useState(initialSnap?.competencies[0]?.id ?? "");
  const [level, setLevel] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [jobRole, setJobRole] = useState("OTHER");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSnap) {
      setSnap(initialSnap);
      setSelectedId(initialSnap.competencies[0]?.id ?? "");
      return;
    }
    const encoded = encodeURIComponent(slug);
    fetch(`/api/demo/${encoded}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "데모를 불러올 수 없습니다.",
          );
        }
        return data as Snap;
      })
      .then((data) => {
        setSnap(data);
        setSelectedId(data.competencies[0]?.id ?? "");
        if (data.workspace.slug && data.workspace.slug !== slug) {
          // ASCII로 고쳐진 slug로 URL 정리
          router.replace(`/demo/${encodeURIComponent(data.workspace.slug)}`);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "오류"));
  }, [slug, initialSnap, router]);

  const startInterview = async () => {
    if (!snap) return;
    const comp = snap.competencies.find((c) => c.id === selectedId);
    if (!comp) {
      setStartError("연습할 역량을 선택해 주세요.");
      return;
    }
    setStarting(true);
    setStartError(null);
    const publicSlug = snap.workspace.slug ?? slug;
    try {
      const res = await fetch(`/api/demo/${encodeURIComponent(publicSlug)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusCompetency: comp.code,
          jobRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(
          `/auth/login?next=${encodeURIComponent(`/demo/${encodeURIComponent(publicSlug)}`)}`,
        );
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : `면접을 시작하지 못했습니다. (${res.status})`,
        );
      }
      router.push(`/interview/${data.sessionId}`);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "면접을 시작하지 못했습니다.");
      setStarting(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-3 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="text-xs text-muted">
          관리자 → 고객 데모 → 해당 워크스페이스를 연 뒤 「데모 미리보기」를 다시 눌러 주세요.
          (한글 URL은 ASCII slug로 자동 교정됩니다)
        </p>
      </div>
    );
  }
  if (!snap) {
    return <p className="text-center text-sm text-muted">불러오는 중…</p>;
  }

  const comp = snap.competencies.find((c) => c.id === selectedId);
  const levelQuestions = snap.questions.filter(
    (q) => q.competencyId === selectedId && q.level === level,
  );
  const allForComp = snap.questions.filter((q) => q.competencyId === selectedId);
  const rubric = comp?.rubricByLevel[String(level)] ?? comp?.rubricByLevel.default ?? [];

  return (
    <div className="space-y-8">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gold">AXHRD Demo</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{snap.workspace.name}</h1>
        {snap.workspace.description && (
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{snap.workspace.description}</p>
        )}
      </header>

      <section className="rounded-xl border border-accent/40 bg-accent/5 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">데모 면접 실행</h2>
        <p className="mt-1 text-xs text-muted">
          키트에 넣은 역량으로 모의면접을 시작합니다. Global 역량은 NCS 면접 축에 매핑되어
          실행됩니다.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-xs text-muted">
            직무
            <select
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="input-luxe mt-1 block min-w-[10rem] text-sm"
            >
              {JOB_ROLES.map((r) => (
                <option key={r} value={r}>
                  {jobRoleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void startInterview()}
            disabled={starting || snap.competencies.length === 0}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            {starting ? "세션 준비 중…" : "이 구성으로 면접하기"}
          </button>
        </div>
        {startError ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {startError}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-card-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">역량</h2>
        {snap.competencies.length === 0 ? (
          <p className="text-sm text-muted">아직 키트에 역량이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {snap.competencies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  selectedId === c.id
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-card-border text-muted"
                }`}
              >
                {c.nameKo}
                <span className="ml-1 text-xs opacity-70">({c.code})</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {comp && (
        <>
          <section className="rounded-xl border border-card-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              질문 리스트 · {comp.nameKo}
              <span className="ml-2 text-xs font-normal text-muted">총 {allForComp.length}문항</span>
            </h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {LEVELS.map((lv) => {
                const n = snap.questions.filter(
                  (q) => q.competencyId === selectedId && q.level === lv,
                ).length;
                return (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    className={`rounded px-3 py-1 text-xs font-medium ${
                      level === lv ? "bg-gold/20 text-gold" : "bg-muted/10 text-muted"
                    }`}
                  >
                    L{lv}
                    {n > 0 ? ` · ${n}` : ""}
                  </button>
                );
              })}
            </div>
            <ul className="space-y-2">
              {levelQuestions.length === 0 ? (
                <li className="text-sm text-muted">이 레벨에 등록된 질문이 없습니다.</li>
              ) : (
                levelQuestions.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-lg border border-card-border px-3 py-3 text-sm leading-relaxed"
                  >
                    {q.template}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-card-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              루브릭 · {comp.nameKo} L{level}
            </h2>
            {rubric.length === 0 ? (
              <p className="text-sm text-muted">등록된 루브릭 기준이 없습니다.</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                {rubric.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
