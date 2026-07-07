"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from "framer-motion";
import { Bookmark, X as XIcon, RotateCcw } from "lucide-react";
import { INDUSTRY_CODES, JOB_ROLES } from "@/types";
import { industryLabel, jobRoleLabel } from "@/lib/labels";
import { IconLoader } from "@/components/ui/icons";
import { AnswerPracticeModal } from "@/components/practice/AnswerPracticeModal";

type Card = {
  id: string;
  text: string;
  industry: string;
  jobRole: string;
  savedAt?: string;
  answerTranscript?: string | null;
  answeredAt?: string | null;
};

type SwipeActionType = "PASS" | "SAVE";

export function SwipeDeck({
  initialIndustry,
  initialJobRole,
}: {
  initialIndustry: string | null;
  initialJobRole: string | null;
}) {
  const [industry, setIndustry] = useState<string | null>(initialIndustry);
  const [jobRole, setJobRole] = useState<string | null>(initialJobRole);
  const [editingTarget, setEditingTarget] = useState(!initialIndustry || !initialJobRole);
  const [pendingIndustry, setPendingIndustry] = useState(initialIndustry ?? INDUSTRY_CODES[0]);
  const [pendingJobRole, setPendingJobRole] = useState(initialJobRole ?? JOB_ROLES[0]);

  const [deck, setDeck] = useState<Card[]>([]);
  const [initialTotal, setInitialTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comboCount, setComboCount] = useState<number | null>(null);
  const [recycled, setRecycled] = useState(false);

  const [showSaved, setShowSaved] = useState(false);
  const [savedList, setSavedList] = useState<Card[] | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);
  const [practiceCard, setPracticeCard] = useState<Card | null>(null);

  const loadDeck = useCallback(async (ind: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/questions/swipe-deck?industry=${ind}&jobRole=${role}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "카드를 불러오지 못했습니다.");
      setDeck(data.deck);
      setInitialTotal(data.deck.length);
      setComboCount(data.comboCount);
      setRecycled(data.recycled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "카드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (industry && jobRole) loadDeck(industry, jobRole);
  }, [industry, jobRole, loadDeck]);

  const confirmTarget = () => {
    setIndustry(pendingIndustry);
    setJobRole(pendingJobRole);
    setEditingTarget(false);
    fetch("/api/profile/preference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        desiredIndustry: pendingIndustry,
        desiredJobRole: pendingJobRole,
      }),
    }).catch(() => {});
  };

  const handleSwipe = (card: Card, action: SwipeActionType) => {
    setDeck((d) => d.filter((c) => c.id !== card.id));
    fetch("/api/questions/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: card.id, action }),
    }).catch(() => {});
    // Save는 단순 북마크로 끝내지 않고 바로 그 자리에서 답변 녹음까지 이어간다
    if (action === "SAVE") setPracticeCard(card);
  };

  const openSaved = async () => {
    setShowSaved(true);
    setSavedLoading(true);
    try {
      const res = await fetch("/api/questions/swipe");
      const data = await res.json();
      if (res.ok) setSavedList(data.saved);
    } finally {
      setSavedLoading(false);
    }
  };

  if (editingTarget) {
    return (
      <div className="card-luxe space-y-5 p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Setup</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">어떤 직무를 준비 중이신가요?</h2>
        </div>
        <select
          value={pendingIndustry}
          onChange={(e) => setPendingIndustry(e.target.value)}
          className="input-luxe w-full"
        >
          {INDUSTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {industryLabel(code)}
            </option>
          ))}
        </select>
        <select
          value={pendingJobRole}
          onChange={(e) => setPendingJobRole(e.target.value)}
          className="input-luxe w-full"
        >
          {JOB_ROLES.map((code) => (
            <option key={code} value={code}>
              {jobRoleLabel(code)}
            </option>
          ))}
        </select>
        <button type="button" onClick={confirmTarget} className="btn-primary w-full py-3.5">
          카드 덱 시작
        </button>
      </div>
    );
  }

  const progress =
    initialTotal > 0 ? Math.round(((initialTotal - deck.length) / initialTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-card-border bg-white/80 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEditingTarget(true)}
            className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15"
          >
            {industryLabel(industry!)} · {jobRoleLabel(jobRole!)}
          </button>
          <button
            type="button"
            onClick={openSaved}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-primary"
          >
            <Bookmark className="h-4 w-4" />
            저장함
          </button>
        </div>
        {initialTotal > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>진행률</span>
              <span>{initialTotal - deck.length}/{initialTotal}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {comboCount !== null && comboCount < 5 && (
        <p className="text-center text-xs text-muted">
          이 조합엔 참고 질문이 {comboCount}개뿐이라 관련 산업군·직무 질문도 섞어서 보여드려요
        </p>
      )}

      {loading ? (
        <div className="flex h-[420px] items-center justify-center">
          <IconLoader className="h-8 w-8 text-accent" />
        </div>
      ) : error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-center text-sm text-danger">
          {error}
        </p>
      ) : deck.length === 0 ? (
        <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-card-border text-center">
          <p className="text-foreground">카드를 모두 봤어요</p>
          <button
            type="button"
            onClick={() => industry && jobRole && loadDeck(industry, jobRole)}
            className="btn-secondary"
          >
            <RotateCcw className="h-4 w-4" />
            다시 보기
          </button>
        </div>
      ) : (
        <>
          {recycled && (
            <p className="text-center text-xs text-muted">
              새 카드가 없어 이전 카드를 다시 보여드려요
            </p>
          )}
          <div className="relative h-[440px]">
            <AnimatePresence>
              {deck.slice(0, 3).map((card, i) => (
                <SwipeCard
                  key={card.id}
                  card={card}
                  depth={i}
                  isTop={i === 0}
                  onSwipe={(action) => handleSwipe(card, action)}
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-8 pt-2">
            <button
              type="button"
              onClick={() => deck[0] && handleSwipe(deck[0], "PASS")}
              aria-label="Pass"
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-rose-500 shadow-lg transition hover:scale-105 hover:bg-rose-50">
                <XIcon className="h-7 w-7" />
              </span>
              <span className="text-xs font-medium text-muted">넘기기</span>
            </button>
            <button
              type="button"
              onClick={() => deck[0] && handleSwipe(deck[0], "SAVE")}
              aria-label="Save"
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-emerald-600 shadow-lg transition hover:scale-105 hover:bg-emerald-50">
                <Bookmark className="h-7 w-7" />
              </span>
              <span className="text-xs font-medium text-muted">저장·연습</span>
            </button>
          </div>
        </>
      )}

      {showSaved && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-6 shadow-luxe sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">저장한 질문</h2>
              <button
                type="button"
                onClick={() => setShowSaved(false)}
                className="text-muted hover:text-foreground"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {savedLoading ? (
              <div className="flex justify-center py-8">
                <IconLoader className="h-6 w-6 text-accent" />
              </div>
            ) : !savedList || savedList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                아직 저장한 질문이 없어요
              </p>
            ) : (
              <ul className="space-y-3">
                {savedList.map((q) => (
                  <li key={q.id} className="rounded-xl border border-card-border p-3">
                    <p className="text-sm text-foreground">{q.text}</p>
                    <p className="mt-1 text-xs text-muted">
                      {industryLabel(q.industry)} · {jobRoleLabel(q.jobRole)}
                    </p>
                    {q.answerTranscript && (
                      <p className="mt-2 rounded-lg bg-background p-2 text-xs text-foreground">
                        {q.answerTranscript}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setPracticeCard(q)}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      {q.answerTranscript ? "다시 답변 연습하기" : "답변 연습하기"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {practiceCard && (
        <AnswerPracticeModal
          card={practiceCard}
          onClose={() => setPracticeCard(null)}
          onSaved={(transcript) => {
            setSavedList((list) =>
              list
                ? list.map((q) =>
                    q.id === practiceCard.id ? { ...q, answerTranscript: transcript } : q
                  )
                : list
            );
          }}
        />
      )}
    </div>
  );
}

function SwipeCard({
  card,
  depth,
  isTop,
  onSwipe,
}: {
  card: Card;
  depth: number;
  isTop: boolean;
  onSwipe: (action: SwipeActionType) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const passOpacity = useTransform(x, [-100, -20], [1, 0]);
  const saveOpacity = useTransform(x, [20, 100], [0, 1]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) onSwipe("SAVE");
    else if (info.offset.x < -100) onSwipe("PASS");
  };

  return (
    <motion.div
      style={{ zIndex: 10 - depth, ...(isTop ? { x, rotate } : {}) }}
      drag={isTop ? "x" : false}
      dragElastic={0.6}
      onDragEnd={isTop ? handleDragEnd : undefined}
      initial={{ scale: 1 - depth * 0.05, y: depth * 10, opacity: depth === 0 ? 1 : 0.7 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 10, opacity: depth === 0 ? 1 : 0.7 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="swipe-card-pro absolute inset-0 flex cursor-grab flex-col justify-between overflow-hidden rounded-3xl p-0 active:cursor-grabbing"
    >
      <div className="bg-gradient-to-r from-[#0c1222] to-[#141d32] px-6 py-5">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold">
          Interview Question
        </p>
        <p className="mt-1.5 text-sm font-medium text-white/70">
          {industryLabel(card.industry)} · {jobRoleLabel(card.jobRole)}
        </p>
      </div>
      {isTop && (
        <>
          <motion.span
            style={{ opacity: passOpacity }}
            className="absolute left-5 top-20 z-10 rotate-[-12deg] rounded-lg border-[3px] border-rose-500 px-3 py-1 text-lg font-black text-rose-500"
          >
            PASS
          </motion.span>
          <motion.span
            style={{ opacity: saveOpacity }}
            className="absolute right-5 top-20 z-10 rotate-[12deg] rounded-lg border-[3px] border-emerald-500 px-3 py-1 text-lg font-black text-emerald-600"
          >
            SAVE
          </motion.span>
        </>
      )}
      <div className="flex flex-1 items-center justify-center px-8 py-8 text-center">
        <p className="text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
          {card.text}
        </p>
      </div>
      <div className="border-t border-card-border bg-gradient-to-r from-gold/5 to-primary/5 px-6 py-3 text-center">
        <p className="text-xs font-medium tracking-wide text-muted">
          ← Pass · Save →
        </p>
      </div>
    </motion.div>
  );
}
