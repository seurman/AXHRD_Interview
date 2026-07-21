"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { GameAnswerPayload, GameLevel } from "@/lib/competency-game/types";
import { DIFFICULTY_LABEL_KO } from "@/lib/competency-game/types";
import { ChoiceGame } from "./games/ChoiceGame";
import { TrueFalseGame } from "./games/TrueFalseGame";
import { OrderGame } from "./games/OrderGame";
import { FillBlankGame } from "./games/FillBlankGame";
import { SwipeJudgeGame } from "./games/SwipeJudgeGame";
import { MatchPairsGame } from "./games/MatchPairsGame";
import { SpotWeakGame } from "./games/SpotWeakGame";
import { ChipBuildGame } from "./games/ChipBuildGame";
import { SpeakAlongGame } from "./games/SpeakAlongGame";

type Props = {
  level: GameLevel;
  competency: string;
  hearts: number;
  theta?: number;
};

function hasAnswerFor(item: GameLevel["items"][number], answers: GameAnswerPayload[]) {
  return answers.some((a) => a.itemId === item.id);
}

export function GameLevelRunner({
  level,
  competency,
  hearts: initialHearts,
  theta: initialTheta = 0,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GameAnswerPayload[]>([]);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [hearts, setHearts] = useState(initialHearts);
  const [theta, setTheta] = useState(initialTheta);
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
            playedItemIds: level.items.map((i) => i.id),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "제출 실패");
        if (typeof json.hearts === "number") setHearts(json.hearts);
        if (typeof json.theta === "number") setTheta(json.theta);
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
    const answered = hasAnswerFor(item, answers);
    if (!answered && item.gameType !== "order" && item.gameType !== "chip_build") {
      toast.message("답을 선택해 주세요");
      return;
    }
    if (
      (item.gameType === "order" || item.gameType === "chip_build") &&
      !answered
    ) {
      toast.message("순서를 확정해 주세요");
      return;
    }

    if (step + 1 >= level.items.length) {
      submitLevel(answers);
      return;
    }
    setStep((s) => s + 1);
  };

  const gameNode = useMemo(() => {
    if (!item) return null;
    const disabled = pending || cleared;
    const key = `${runKey}-${item.id}`;

    switch (item.gameType) {
      case "choice":
        return (
          <ChoiceGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(answerIndex) =>
              setAnswerForCurrent({ gameType: "choice", itemId: item.id, answerIndex })
            }
          />
        );
      case "true_false":
        return (
          <TrueFalseGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(judgedTrue) =>
              setAnswerForCurrent({
                gameType: "true_false",
                itemId: item.id,
                judgedTrue,
              })
            }
          />
        );
      case "order":
        return (
          <OrderGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(order) =>
              setAnswerForCurrent({ gameType: "order", itemId: item.id, order })
            }
          />
        );
      case "fill_blank":
        return (
          <FillBlankGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(blankIndexes) =>
              setAnswerForCurrent({
                gameType: "fill_blank",
                itemId: item.id,
                blankIndexes,
              })
            }
          />
        );
      case "swipe_judge":
        return (
          <SwipeJudgeGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(judgedGood) =>
              setAnswerForCurrent({
                gameType: "swipe_judge",
                itemId: item.id,
                judgedGood,
              })
            }
          />
        );
      case "match_pairs":
        return (
          <MatchPairsGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(map) =>
              setAnswerForCurrent({ gameType: "match_pairs", itemId: item.id, map })
            }
          />
        );
      case "spot_weak":
        return (
          <SpotWeakGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(weakIndex) =>
              setAnswerForCurrent({
                gameType: "spot_weak",
                itemId: item.id,
                weakIndex,
              })
            }
          />
        );
      case "chip_build":
        return (
          <ChipBuildGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={(order) =>
              setAnswerForCurrent({
                gameType: "chip_build",
                itemId: item.id,
                order,
              })
            }
          />
        );
      case "speak_along":
        return (
          <SpeakAlongGame
            key={key}
            item={item}
            disabled={disabled}
            onAnswer={() =>
              setAnswerForCurrent({
                gameType: "speak_along",
                itemId: item.id,
                completed: true,
              })
            }
          />
        );
    }
  }, [item, pending, cleared, runKey]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            레벨 {level.index + 1} · {DIFFICULTY_LABEL_KO[level.difficulty]}
          </p>
          <h1 className="text-xl font-bold text-foreground">{level.titleKo}</h1>
        </div>
        <div className="text-right text-xs text-muted">
          <p>❤️ {hearts}</p>
          <p>
            θ {theta.toFixed(2)} · {step + 1}/{level.items.length}
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
              <p className="text-sm text-muted">
                +{xpEarned} XP · θ {theta.toFixed(2)}
              </p>
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
