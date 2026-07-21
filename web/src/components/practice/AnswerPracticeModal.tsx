"use client";

import { useState } from "react";
import Link from "next/link";
import { X as XIcon } from "lucide-react";
import { VoiceRecorder } from "@/components/interview/VoiceRecorder";
import { industryLabel, jobRoleLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type PracticeCard = {
  id: string;
  text: string;
  industry: string;
  jobRole: string;
  answerTranscript?: string | null;
};

export function AnswerPracticeModal({
  card,
  onClose,
  onSaved,
}: {
  card: PracticeCard;
  onClose: () => void;
  onSaved: (transcript: string) => void;
}) {
  const { dict } = useI18n();
  const s = dict.swipe;
  const [savedTranscript, setSavedTranscript] = useState<string | null>(
    card.answerTranscript ?? null
  );
  const [saving, setSaving] = useState(false);
  const [recordingAgain, setRecordingAgain] = useState(!card.answerTranscript);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);

  const handleTranscript = async (text: string) => {
    setSaving(true);
    setLimitError(null);
    setUpgradeUrl(null);
    try {
      const res = await fetch("/api/questions/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: card.id,
          action: "SAVE",
          answerTranscript: text,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setLimitError(json.error ?? "이번 주 드릴 한도에 도달했습니다.");
        setUpgradeUrl(
          typeof json.upgradeUrl === "string" ? json.upgradeUrl : "/pricing",
        );
        return;
      }
      if (!res.ok) {
        setLimitError(json.error ?? "저장에 실패했습니다.");
        return;
      }
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
            <p className="mt-1 font-medium leading-relaxed text-foreground">{card.text}</p>
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
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm leading-relaxed text-foreground">
              {savedTranscript}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecordingAgain(true)}
                className="btn-secondary flex-1"
              >
                {s.recordAgain}
              </button>
              <button type="button" onClick={onClose} className="btn-primary flex-1">
                {s.complete}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <VoiceRecorder onTranscript={handleTranscript} disabled={saving} />
            <p className="text-center text-xs leading-relaxed text-muted">{s.practiceNote}</p>
            {limitError ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                <p className="text-foreground">{limitError}</p>
                {upgradeUrl ? (
                  <Link
                    href={upgradeUrl}
                    className="mt-1 inline-flex text-xs text-accent hover:underline"
                  >
                    플랜 업그레이드 →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
