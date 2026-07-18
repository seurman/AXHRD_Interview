"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateScenarioPayload } from "@/lib/assessment/load-scenario-context";
import type { DialogueTurn } from "@/lib/assessment/role-play-engine";

/**
 * 역할연기 실행 화면 — 상대역과의 멀티턴 대화.
 * 채점 기준·페르소나 지침은 서버가 내려주지 않으므로 이 화면에는 존재하지 않는다.
 */
export function RolePlayRunner({
  attemptId,
  scenario,
  initialDialogue,
}: {
  attemptId: string;
  scenario: CandidateScenarioPayload;
  initialDialogue: DialogueTurn[];
}) {
  const router = useRouter();
  const [dialogue, setDialogue] = useState<DialogueTurn[]>(initialDialogue);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(dialogue.length <= 1);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const turnsUsed = dialogue.filter((t) => t.role === "CANDIDATE").length;
  const canContinue = turnsUsed < scenario.maxTurns;
  const personaName = scenario.personaName ?? "상대역";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dialogue.length]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || sending || !canContinue) return;
    setSending(true);
    setError(null);
    setDialogue((d) => [...d, { role: "CANDIDATE", text: message, at: Date.now() }]);
    setInput("");
    try {
      const res = await fetch(`/api/assessment/attempts/${attemptId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error ?? "응답 생성에 실패했습니다. 다시 시도해 주세요.");
        // 실패한 발화 롤백(서버에 저장 안 됨)
        setDialogue((d) => d.slice(0, -1));
        setInput(message);
        return;
      }
      setDialogue((d) => [...d, { role: "PERSONA", text: data.reply!, at: Date.now() }]);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setDialogue((d) => d.slice(0, -1));
      setInput(message);
    } finally {
      setSending(false);
    }
  }

  async function submit() {
    if (submitting) return;
    if (turnsUsed < 1) {
      setError("최소 1회 이상 발화한 뒤 제출할 수 있습니다.");
      return;
    }
    if (
      canContinue &&
      !window.confirm("대화를 종료하고 제출할까요? 제출 후에는 수정할 수 없습니다.")
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessment/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "제출에 실패했습니다.");
        return;
      }
      router.push(`/assessment/attempt/${attemptId}/report`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">역할연기 과제</p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{scenario.titleKo}</h1>
          {scenario.roleContext ? (
            <p className="mt-1 text-sm text-muted">{scenario.roleContext}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted">
          발화 {turnsUsed} / {scenario.maxTurns}턴
        </span>
      </div>

      <section className="card-luxe p-4">
        <button
          type="button"
          onClick={() => setBriefOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
        >
          과제 브리핑
          <span className="text-xs text-muted">{briefOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {briefOpen ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
            {scenario.taskBrief}
          </p>
        ) : null}
      </section>

      <section className="card-luxe flex h-[28rem] flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {dialogue.map((turn, i) => (
            <div
              key={`${turn.at}-${i}`}
              className={turn.role === "CANDIDATE" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  turn.role === "CANDIDATE"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-foreground px-4 py-2.5 text-sm leading-relaxed text-background"
                    : "max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground"
                }
              >
                {turn.role === "PERSONA" ? (
                  <p className="mb-1 text-xs font-medium text-accent">
                    {personaName}
                    {scenario.personaRole ? ` · ${scenario.personaRole}` : ""}
                  </p>
                ) : null}
                <p className="whitespace-pre-line">{turn.text}</p>
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm text-muted">
                {personaName} 입력 중…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 border-t border-card-border pt-3">
          {error ? <p className="mb-2 text-xs text-warning">{error}</p> : null}
          {canContinue ? (
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder={`${personaName}에게 말하기… (Enter 전송, Shift+Enter 줄바꿈)`}
                className="min-h-[3rem] flex-1 resize-none rounded-xl border border-card-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                disabled={sending || submitting}
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={sending || submitting || !input.trim()}
                className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                전송
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              대화 턴을 모두 사용했습니다. 아래에서 제출해 주세요.
            </p>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || sending || turnsUsed < 1}
          className="rounded-xl border border-card-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "채점 중… (최대 1분)" : "대화 종료 · 제출하기"}
        </button>
      </div>
    </div>
  );
}
