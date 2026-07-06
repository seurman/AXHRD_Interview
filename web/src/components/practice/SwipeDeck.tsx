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
  sourceName: string | null;
  sourceUrl: string | null;
  isAiExample: boolean;
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
      <div className="card-luxe space-y-4 p-6">
        <p className="text-sm text-muted">
          어떤 직무를 준비 중이신가요? 고르신 조합에 맞는 질문만 보여드립니다.
        </p>
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
        <button type="button" onClick={confirmTarget} className="btn-primary w-full">
          카드 보기 시작
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setEditingTarget(true)}
          className="rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary hover:bg-primary/15"
        >
          {industryLabel(industry!)} · {jobRoleLabel(jobRole!)} 변경
        </button>
        <button
          type="button"
          onClick={openSaved}
          className="flex items-center gap-1 text-muted hover:text-primary"
        >
          <Bookmark className="h-4 w-4" />
          저장한 질문
        </button>
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
          <div className="relative h-[420px]">
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

          <div className="flex justify-center gap-6">
            <button
              type="button"
              onClick={() => handleSwipe(deck[0], "PASS")}
              aria-label="Pass"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-card-border bg-card text-danger shadow-luxe hover:bg-danger/5"
            >
              <XIcon className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => handleSwipe(deck[0], "SAVE")}
              aria-label="Save"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-card-border bg-card text-success shadow-luxe hover:bg-success/5"
            >
              <Bookmark className="h-6 w-6" />
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
                      {industryLabel(q.industry)} · {jobRoleLabel(q.jobRole)} ·{" "}
                      {q.isAiExample ? "AI 생성 예시" : q.sourceName ?? "출처 미상"}
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
      style={isTop ? { x, rotate } : undefined}
      drag={isTop ? "x" : false}
      dragElastic={0.6}
      onDragEnd={isTop ? handleDragEnd : undefined}
      initial={{ scale: 1 - depth * 0.05, y: depth * 10, opacity: depth === 0 ? 1 : 0.7 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 10, opacity: depth === 0 ? 1 : 0.7 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="card-luxe absolute inset-0 flex cursor-grab flex-col justify-between p-6 active:cursor-grabbing"
    >
      {isTop && (
        <>
          <motion.span
            style={{ opacity: passOpacity }}
            className="absolute left-4 top-4 rounded-lg border-2 border-danger px-2 py-1 text-sm font-bold text-danger"
          >
            PASS
          </motion.span>
          <motion.span
            style={{ opacity: saveOpacity }}
            className="absolute right-4 top-4 rounded-lg border-2 border-success px-2 py-1 text-sm font-bold text-success"
          >
            SAVE
          </motion.span>
        </>
      )}
      <div className="flex flex-1 items-center justify-center text-center">
        <p className="text-lg font-medium leading-relaxed text-foreground">{card.text}</p>
      </div>
      <p className="text-center text-xs text-muted">
        {industryLabel(card.industry)} · {jobRoleLabel(card.jobRole)} ·{" "}
        {card.isAiExample ? "AI 생성 예시" : card.sourceName ?? "출처 미상"}
      </p>
    </motion.div>
  );
}
