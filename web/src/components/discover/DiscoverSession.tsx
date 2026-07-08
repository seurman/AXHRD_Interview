"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader } from "@/components/ui/icons";
import { VoiceRecorder } from "@/components/interview/VoiceRecorder";
import { LoadingRitual } from "@/components/ux/LoadingRitual";

export interface DiscoverQuestionState {
  code: string;
  text: string;
  hint?: string;
}

interface DiscoverSessionProps {
  sessionId: string;
  initialQuestion: DiscoverQuestionState;
  questionIndex: number;
  totalQuestions: number;
}

export function DiscoverSession({
  sessionId,
  initialQuestion,
  questionIndex: initialIndex,
  totalQuestions,
}: DiscoverSessionProps) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialQuestion);
  const [questionIndex, setQuestionIndex] = useState(initialIndex);
  const [textAnswer, setTextAnswer] = useState("");
  const [processing, setProcessing] = useState(false);

  const submitAnswer = async (answer: string) => {
    const trimmed = answer.trim();
    if (!trimmed || processing) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/discover/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionCode: question.code,
          answerText: trimmed,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `서버 오류 (${res.status})`);
      }

      const data = await res.json();

      if (data.completed) {
        router.push(data.redirectUrl ?? `/discover/${sessionId}/report`);
        return;
      }

      setQuestion(data.nextQuestion);
      setQuestionIndex(data.questionIndex);
      setTextAnswer("");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "답변 저장 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const handleVoice = (transcript: string) => {
    setTextAnswer(transcript);
  };

  const progress = ((questionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>
            질문 {questionIndex + 1} / {totalQuestions}
          </span>
          <span className="text-xs">채점 없음 · 성찰 대화</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <section className="card-luxe space-y-4 p-6">
        <p className="text-lg font-medium leading-relaxed text-foreground">{question.text}</p>
        {question.hint && (
          <p className="text-xs text-muted">💡 {question.hint}</p>
        )}
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">답변하기</h2>
        <p className="text-sm text-muted">
          음성으로 말하거나, 아래에 직접 입력해 주세요. 정답은 없습니다 — 편하게 이야기해 주세요.
        </p>

        <VoiceRecorder onTranscript={handleVoice} disabled={processing} />

        <textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          rows={6}
          placeholder="여기에 답변을 입력하거나, 위 마이크 버튼으로 음성 답변을 사용하세요."
          className="w-full resize-y rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none"
          disabled={processing}
        />

        <button
          type="button"
          onClick={() => submitAnswer(textAnswer)}
          disabled={processing || !textAnswer.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing && questionIndex + 1 < totalQuestions ? (
            <>
              <IconLoader className="h-4 w-4 animate-spin" />
              저장 중…
            </>
          ) : processing ? (
            "리포트로 이동 중…"
          ) : questionIndex + 1 >= totalQuestions ? (
            "마지막 답변 제출하고 결과 보기"
          ) : (
            "다음 질문으로"
          )}
        </button>
      </section>

      {processing && (
        <section className="card-luxe px-4 pb-2 pt-1">
          <LoadingRitual
            variant={questionIndex + 1 >= totalQuestions ? "report" : "discover"}
            compact
          />
        </section>
      )}

      <p className="text-center text-xs text-muted">
        이 대화는 평가·채점되지 않습니다. 솔직한 이야기일수록 더 의미 있는 발견이 됩니다.
      </p>
    </div>
  );
}
