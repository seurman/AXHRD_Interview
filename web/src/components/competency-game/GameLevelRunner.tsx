"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { GameAnswerPayload, GameLevel } from "@/lib/competency-game/types";
import { ChoiceGame } from "./games/ChoiceGame";
import { OrderGame } from "./games/OrderGame";
import { FillBlankGame } from "./games/FillBlankGame";
import { SwipeJudgeGame } from "./games/SwipeJudgeGame";
import { SpeakAlongGame } from "./games/SpeakAlongGame";

type Props = {
  level: GameLevel;
  competency: string;
  hearts: number;
};

export function GameLevelRunner({ level, competency, hearts: initialHearts }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GameAnswerPayload[]>([]);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [hearts, setHearts] = useState(initialHearts);
  const [runKey, setRunKey] = useState(0);

  const item = level.items[step];
  const progressPct = Math.round(
    ((step + (cleared ? 1 : 0)) / Math.max(1, level.items.length)) * 100,
  );

  const setAnswerForCurrent = (payload: GameAnswerPayload) => {
    setAnswers((prev) => {
      const rest = prev.filter((a) => a.itemId !== payload.itemId);
      return [...rest, payload];
    });
  };

  const resetRun = () => {
    setStep(0);
    setAnswers([]);
    setFeedback(null);
    setCleared(false);
    setXpEarned(0);
    setRunKey((k) => k + 1);
  };

  const submitLevel = (finalAnswers: GameAnswerPayload[]) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/competency-game/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competency,
            levelId: level.id,
            answers: finalAnswers,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "제출 실패");
        if (typeof json.hearts === "number") setHearts(json.hearts);
        setXpEarned(json.xpGained ?? 0);
        if (json.allCorrect) {
          setCleared(true);
          setFeedback(null);
          toast.success(json.message ?? "레벨 클리어!");
        } else {
          setFeedback(json.message ?? "일부 문항이 아쉬워요. 다시 도전해 보세요.");
          toast.message("다시 한 번!");
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "제출 실패");
      }
    });
  };

  const goNext = () => {
    if (!item) return;
    const hasAnswer = answers.some((a) => a.itemId === item.id);
    if (!hasAnswer && item.gameType !== "order") {
      toast.message("답을 선택해 주세요");
      return;
    }

    let finalAnswers = answers;
    if (item.gameType === "order" && !hasAnswer) {
      const orderPayload: GameAnswerPayload = {
        gameType: "order",
        itemId: item.id,
        order: item.cards.map((_, i) => i),
      };
      setAnswerForCurrent(orderPayload);
      finalAnswers = [...answers.filter((a) => a.itemId !== item.id), orderPayload];
    }

    if (step + 1 >= level.items.length) {
      submitLevel(finalAnswers);
      return;
    }
    setStep((s) => s + 1);
  };

  const gameNode = useMemo(() => {
    if (!item) return null;
    if (item.gameType === "choice") {
      return (
        <ChoiceGame
          key={`${runKey}-${item.id}`}
          item={item}
          disabled={pending || cleared}
          onAnswer={(answerIndex) =>
            setAnswerForCurrent({
              gameType: "choice",
              itemId: item.id,
              answerIndex,
            })
          }
        />
      );
    }
    if (item.gameType === "order") {
      return (
        <OrderGame
          key={`${runKey}-${item.id}`}
          item={item}
          disabled={pending || cleared}
          onAnswer={(order) =>
            setAnswerForCurrent({ gameType: "order", itemId: item.id, order })
          }
        />
      );
    }
    if (item.gameType === "fill_blank") {
      return (
        <FillBlankGame
          key={`${runKey}-${item.id}`}
          item={item}
          disabled={pending || cleared}
          onAnswer={(blankIndexes) =>
            setAnswerForCurrent({
              gameType: "fill_blank",
              itemId: item.id,
              blankIndexes,
            })
          }
        />
      );
    }
    if (item.gameType === "swipe_judge") {
      return (
        <SwipeJudgeGame
          key={`${runKey}-${item.id}`}
          item={item}
          disabled={pending || cleared}
          onAnswer={(judgedGood) =>
            setAnswerForCurrent({
              gameType: "swipe_judge",
              itemId: item.id,
              judgedGood,
            })
          }
        />
      );
    }
    return (
      <SpeakAlongGame
        key={`${runKey}-${item.id}`}
        item={item}
        disabled={pending || cleared}
        onAnswer={() =>
          setAnswerForCurrent({
            gameType: "speak_along",
            itemId: item.id,
            completed: true,
          })
        }
      />
    );
  }, [item, pending, cleared, runKey]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            레벨 {level.index + 1}
          </p>
          <h1 className="text-xl font-bold text-foreground">{level.titleKo}</h1>
        </div>
        <div className="text-right text-xs text-muted">
          <p>❤️ {hearts}</p>
          <p>
            {step + 1}/{level.items.length}
          </p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-gold to-primary"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={cleared ? "clear" : `${runKey}-${item?.id ?? "empty"}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="card-luxe p-5"
        >
          {cleared ? (
            <div className="space-y-3 text-center">
              <p className="text-2xl font-bold text-foreground">레벨 클리어!</p>
              <p className="text-sm text-muted">+{xpEarned} XP</p>
              <button
                type="button"
                onClick={() =>
                  router.push(`/practice/game/${competency.toLowerCase()}`)
                }
                className="btn-primary min-h-11 w-full text-sm"
              >
                패스 맵으로
              </button>
            </div>
          ) : (
            gameNode
          )}
        </motion.div>
      </AnimatePresence>

      {feedback ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-foreground">
            {feedback}
          </p>
          <button
            type="button"
            onClick={resetRun}
            className="btn-secondary min-h-11 w-full text-sm"
          >
            다시 도전
          </button>
        </div>
      ) : null}

      {!cleared && !feedback ? (
        <button
          type="button"
          disabled={pending}
          onClick={goNext}
          className="btn-primary min-h-11 w-full text-sm disabled:opacity-50"
        >
          {pending
            ? "채점 중…"
            : step + 1 >= level.items.length
              ? "제출하고 클리어"
              : "다음"}
        </button>
      ) : null}
    </div>
  );
}
