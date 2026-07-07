"use client";

import { useState } from "react";
import { X as XIcon } from "lucide-react";
import { VoiceRecorder } from "@/components/interview/VoiceRecorder";
import { industryLabel, jobRoleLabel } from "@/lib/labels";

export type PracticeCard = {
  id: string;
  text: string;
  industry: string;
  jobRole: string;
  answerTranscript?: string | null;
};

/** 저장한 질문에 실제로 답변을 녹음해보는 화면 — "Save"가 단순 북마크로 끝나지
 *  않고 그 자리에서 연습까지 이어지도록 함. 자체 STT 텍스트만 보여주고 채점은
 *  하지 않는다(비용 원칙 + 모바일=짧은 반복 연습, 심층 분석은 PC 쪽 역할 유지) */
export function AnswerPracticeModal({
  card,
  onClose,
  onSaved,
}: {
  card: PracticeCard;
  onClose: () => void;
  onSaved: (transcript: string) => void;
}) {
  const [savedTranscript, setSavedTranscript] = useState<string | null>(
    card.answerTranscript ?? null
  );
  const [saving, setSaving] = useState(false);
  const [recordingAgain, setRecordingAgain] = useState(!card.answerTranscript);

  const handleTranscript = async (text: string) => {
    setSaving(true);
    try {
      await fetch("/api/questions/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: card.id,
          action: "SAVE",
          answerTranscript: text,
        }),
      });
      setSavedTranscript(text);
      setRecordingAgain(false);
      onSaved(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-6 shadow-luxe sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">
              {industryLabel(card.industry)} · {jobRoleLabel(card.jobRole)}
            </p>
            <p className="mt-1 font-medium text-foreground">{card.text}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted hover:text-foreground"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {savedTranscript && !recordingAgain ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
              {savedTranscript}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecordingAgain(true)}
                className="btn-secondary flex-1"
              >
                다시 녹음하기
              </button>
              <button type="button" onClick={onClose} className="btn-primary flex-1">
                완료
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <VoiceRecorder onTranscript={handleTranscript} disabled={saving} />
            <p className="text-center text-xs text-muted">
              녹음한 답변은 채점되지 않고 내 기록으로만 저장돼요. 자세한 분석은
              모의 면접에서 받아보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
