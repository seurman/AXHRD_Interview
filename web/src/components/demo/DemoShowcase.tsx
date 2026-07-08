"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers, ListChecks, Play, Sparkles } from "lucide-react";
import type { DemoCompetencyDto, DemoQuestionDto } from "@/lib/demo/workspace";
import { JOB_ROLES } from "@/types";
import { jobRoleLabel } from "@/lib/labels";

type Snap = {
  workspace: { name: string; description: string | null; slug?: string };
  competencies: DemoCompetencyDto[];
  questions: DemoQuestionDto[];
};

type Props = {
  slug: string;
  initialSnap?: Snap | null;
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
  const [guestAnswer, setGuestAnswer] = useState("");
  const [guestTrying, setGuestTrying] = useState(false);
  const [guestFeedback, setGuestFeedback] = useState<{
    score: number;
    coaching: string;
    quote: string;
    summary: string;
  } | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSnap) {
      setSnap(initialSnap);
      setSelectedId(initialSnap.competencies[0]?.id ?? "");
      return;
    }
    fetch(`/api/demo/${encodeURIComponent(slug)}`)
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
        body: JSON.stringify({ focusCompetency: comp.code, jobRole }),
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
          typeof data.error === "string"
            ? data.error
            : `면접을 시작하지 못했습니다. (${res.status})`,
        );
      }
      router.push(`/interview/${data.sessionId}`);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "면접을 시작하지 못했습니다.");
      setStarting(false);
    }
  };

  const tryOneQuestion = async () => {
    if (!snap || !comp) return;
    const answer = guestAnswer.trim();
    if (answer.length < 15) {
      setGuestError("15자 이상 답변을 입력해 주세요.");
      return;
    }
    setGuestTrying(true);
    setGuestError(null);
    setGuestFeedback(null);
    const publicSlug = snap.workspace.slug ?? slug;
    try {
      const res = await fetch(`/api/demo/${encodeURIComponent(publicSlug)}/try`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          competencyCode: comp.code,
          level,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "체험에 실패했습니다.");
      }
      setGuestFeedback(data.feedback);
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : "체험에 실패했습니다.");
    } finally {
      setGuestTrying(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="text-xs text-muted">
          관리자 → 고객 데모에서 워크스페이스를 연 뒤 「데모 미리보기」를 다시 눌러 주세요.
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
  const totalQs = snap.questions.length;

  return (
    <div className="space-y-8">
      {/* Hero — kit launch (Greenhouse / HireVue assessment vibe) */}
      <header className="relative overflow-hidden rounded-3xl border border-card-border bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_48%,#0f172a_100%)] px-6 py-10 text-white sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl"
        />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          Live interview kit
        </p>
        <h1 className="relative mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {snap.workspace.name}
        </h1>
        {snap.workspace.description ? (
          <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            {snap.workspace.description}
          </p>
        ) : (
          <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            구성된 역량·문항으로 바로 모의면접을 실행합니다. NCS만 있어도, Global만 있어도
            같은 흐름으로 연습할 수 있습니다.
          </p>
        )}
        <div className="relative mt-6 flex flex-wrap gap-3 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <Layers className="h-3.5 w-3.5 text-gold" />
            역량 {snap.competencies.length}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <ListChecks className="h-3.5 w-3.5 text-gold" />
            문항 {totalQs}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            IRT 적응형
          </span>
        </div>
      </header>

      {/* Launch strip */}
      <section className="rounded-2xl border border-card-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">면접 실행</h2>
            <p className="mt-1 text-sm text-muted">
              아래에서 역량을 고른 뒤 바로 시작합니다. 로그인만 되어 있으면 됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-xs font-medium text-muted">
              직무 맥락
              <select
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                className="input-luxe mt-1 block min-w-[11rem] text-sm"
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
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              {starting ? (
                "세션 준비 중…"
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  이 구성으로 면접하기
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </>
              )}
            </button>
          </div>
        </div>
        {startError ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {startError}
          </p>
        ) : null}
      </section>

      {/* Guest try — 로그인 없이 1문항 체험 */}
      {comp && levelQuestions[0] && (
        <section className="rounded-2xl border border-accent/25 bg-accent/5 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">로그인 없이 1문항 체험</h2>
          <p className="mt-1 text-sm text-muted">
            아래 질문에 답해 보시면 STAR 기반 즉석 피드백을 받을 수 있습니다. (저장되지 않음)
          </p>
          <p className="mt-3 rounded-xl border border-card-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
            {levelQuestions[0].template}
          </p>
          <textarea
            value={guestAnswer}
            onChange={(e) => setGuestAnswer(e.target.value)}
            rows={4}
            placeholder="답변을 입력하세요…"
            className="input-luxe mt-3 w-full text-sm"
            disabled={guestTrying}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void tryOneQuestion()}
              disabled={guestTrying || guestAnswer.trim().length < 15}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {guestTrying ? "피드백 생성 중…" : "즉석 피드백 받기"}
            </button>
            <span className="text-xs text-muted">L{level} · {comp.nameKo}</span>
          </div>
          {guestError && (
            <p className="mt-3 text-sm text-danger">{guestError}</p>
          )}
          {guestFeedback && (
            <div className="mt-4 space-y-2 rounded-xl border border-card-border bg-card p-4 text-sm">
              <p className="font-semibold text-foreground">
                체험 점수 {guestFeedback.score}/5
              </p>
              <p className="text-muted">{guestFeedback.coaching}</p>
              <p className="border-l-2 border-gold pl-3 italic text-foreground">
                「{guestFeedback.quote}」
              </p>
              <p className="text-xs text-muted">{guestFeedback.summary}</p>
            </div>
          )}
        </section>
      )}

      {/* Competency chips */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">초점 역량</h2>
        {snap.competencies.length === 0 ? (
          <p className="text-sm text-muted">아직 키트에 역량이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {snap.competencies.map((c) => {
              const active = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`rounded-xl border px-2.5 py-2 text-left transition ${
                    active
                      ? "border-gold/50 bg-gold/10 ring-1 ring-gold/30"
                      : "border-card-border bg-card hover:border-gold/30"
                  }`}
                >
                  <p className="text-xs font-semibold leading-snug text-foreground sm:text-sm">
                    {c.nameKo}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {c.questionCount}문항
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {comp && (
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="space-y-4 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                질문 · {comp.nameKo}
                <span className="ml-2 font-normal text-muted">총 {allForComp.length}</span>
              </h2>
              <div className="flex flex-wrap gap-1">
                {LEVELS.map((lv) => {
                  const n = snap.questions.filter(
                    (q) => q.competencyId === selectedId && q.level === lv,
                  ).length;
                  return (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevel(lv)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        level === lv
                          ? "bg-foreground text-background"
                          : "bg-card text-muted ring-1 ring-card-border"
                      }`}
                    >
                      L{lv}
                      {n > 0 ? ` ${n}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <ul className="space-y-2">
              {levelQuestions.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
                  이 레벨에 등록된 질문이 없습니다.
                </li>
              ) : (
                levelQuestions.map((q, i) => (
                  <li
                    key={q.id}
                    className="rounded-2xl border border-card-border bg-card px-4 py-3.5 text-sm leading-relaxed text-foreground"
                  >
                    <span className="mr-2 text-[11px] font-semibold text-gold">Q{i + 1}</span>
                    {q.template}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-card-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">
                채점 루브릭 · L{level}
              </h2>
              {rubric.length === 0 ? (
                <p className="mt-3 text-sm text-muted">등록된 루브릭 기준이 없습니다.</p>
              ) : (
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
                  {rubric.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
