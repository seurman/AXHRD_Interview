"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";
import { competencyLabel } from "@/lib/labels";

type TrialFeedback = {
  score: number;
  quote: string;
  coaching: string;
  summary: string;
};

export function TrialTeaser() {
  const [competency, setCompetency] = useState<CompetencyCode>(COMPETENCY_CODES[0]);
  const [level, setLevel] = useState(3);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<TrialFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/trial/try?competency=${competency}&level=${level}`)
      .then((r) => r.json())
      .then((data: { question?: string; error?: string }) => {
        if (data.question) setQuestion(data.question);
        else setQuestion(null);
        if (data.error) setError(data.error);
      })
      .catch(() => setError("문항을 불러오지 못했습니다."));
  }, [competency, level]);

  const submit = async () => {
    if (answer.trim().length < 15) {
      setError("15자 이상 답변을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trial/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencyCode: competency, level, answer: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "체험에 실패했습니다.");
      setFeedback(data.feedback);
      setQuestion(data.question);
    } catch (e) {
      setError(e instanceof Error ? e.message : "체험에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card-luxe space-y-5 border-gold/25 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">1문항 체험</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">계정 없이 바로 맛보기</h2>
          <p className="mt-1 text-sm text-muted">
            로그인 없이 1문항만 체험할 수 있어요. 회원가입하면 월 3회 무료 면접과 역량 리포트가
            열립니다.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {COMPETENCY_CODES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setCompetency(code)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              competency === code
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-card-border text-muted hover:border-gold/30"
            }`}
          >
            {competencyLabel(code)}
          </button>
        ))}
      </div>

      <label className="block text-sm">
        <span className="font-medium text-foreground">난이도</span>
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="input-luxe mt-1 w-full max-w-xs"
        >
          {[1, 2, 3, 4, 5].map((lv) => (
            <option key={lv} value={lv}>
              L{lv}
            </option>
          ))}
        </select>
      </label>

      {question && (
        <div className="rounded-xl border border-card-border bg-background/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">질문</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{question}</p>
        </div>
      )}

      <label className="block text-sm">
        <span className="font-medium text-foreground">답변</span>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          className="input-luxe mt-1 w-full"
          placeholder="STAR 구조로 15자 이상 작성해 보세요."
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      {feedback && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
          <p className="font-semibold text-foreground">맛보기 피드백 (점수 {feedback.score}/5)</p>
          <p className="mt-2 text-muted">{feedback.summary}</p>
          <p className="mt-2 text-foreground">{feedback.coaching}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/auth/register?next=/interview/setup" className="btn-primary text-sm">
              회원가입하고 진짜 리포트 받기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn-secondary text-sm">
              Pro 업그레이드
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading}
        className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        1문항 체험하기
      </button>
    </section>
  );
}
