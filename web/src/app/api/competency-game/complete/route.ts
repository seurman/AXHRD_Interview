import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { findGameLevel } from "@/lib/competency-game/catalog";
import { gradeLevel } from "@/lib/competency-game/engine";
import {
  gameItemParams,
  updateThetaEap,
} from "@/lib/competency-game/irt-game";
import {
  applyLevelClear,
  getOrCreateGameProgress,
  loseHeart,
  updateGameTheta,
} from "@/lib/competency-game/progress";
import type { CompetencyCode } from "@/types";
import type { GameAnswerPayload } from "@/lib/competency-game/types";

export const runtime = "nodejs";

type Body = {
  competency?: CompetencyCode;
  levelId?: string;
  answers?: GameAnswerPayload[];
  playedItemIds?: string[];
  comboBonus?: number;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const competency = body.competency;
  const levelId = body.levelId?.trim();
  const answers = Array.isArray(body.answers) ? body.answers : null;

  if (!competency || !levelId || !answers) {
    return NextResponse.json(
      { error: "competency, levelId, answers are required" },
      { status: 400 },
    );
  }

  const found = findGameLevel(levelId);
  if (!found || found.course.competency !== competency) {
    return NextResponse.json({ error: "Level not found" }, { status: 404 });
  }

  const progress = await getOrCreateGameProgress(user.id, competency);
  if (progress.hearts <= 0) {
    return NextResponse.json(
      {
        error: "하트가 없어요. 내일 다시 도전하거나 다른 코스를 확인해 주세요.",
        hearts: 0,
        allCorrect: false,
        theta: progress.theta,
      },
      { status: 429 },
    );
  }

  const { level } = found;
  const playedIds = new Set(
    Array.isArray(body.playedItemIds) && body.playedItemIds.length > 0
      ? body.playedItemIds
      : answers.map((a) => a.itemId),
  );
  const playItems = level.items.filter((i) => playedIds.has(i.id));
  const playLevel = { ...level, items: playItems.length > 0 ? playItems : level.items };
  const graded = gradeLevel(playLevel, answers);

  const irtResponses = playLevel.items.map((item, idx) => {
    const ans = answers.find((a) => a.itemId === item.id);
    const result = ans
      ? graded.results[playLevel.items.findIndex((i) => i.id === item.id)]
      : null;
    const u: 0 | 1 = result?.correct ? 1 : 0;
    return {
      item: gameItemParams(item, competency, level.difficulty, idx),
      u,
    };
  });
  const irt = updateThetaEap(irtResponses, progress.theta ?? 0, progress.se ?? 1);
  await updateGameTheta(user.id, competency, irt.theta, irt.se);

  const alreadyCleared = Array.isArray(progress.clearedLevelIds)
    ? (progress.clearedLevelIds as string[]).includes(levelId)
    : false;

  const comboRaw = Math.max(0, Math.floor(Number(body.comboBonus ?? 0)));
  // 3콤보 이상이면 콤보×2 XP (최대 +40) — 듀오링고식 연속 정답 보너스
  const comboXp =
    !alreadyCleared && comboRaw >= 3 ? Math.min(40, comboRaw * 2) : 0;
  const xpGained = alreadyCleared ? 0 : graded.xpTotal + comboXp;

  if (!graded.allCorrect) {
    const updated = await loseHeart(user.id, competency);
    const firstWrong = graded.results.find((r) => !r.correct);
    return NextResponse.json({
      ok: true,
      allCorrect: false,
      wrongCount: graded.wrongCount,
      xpGained: 0,
      hearts: updated.hearts,
      theta: irt.theta,
      se: irt.se,
      results: graded.results,
      message: firstWrong?.explain ?? "일부 문항이 아쉬워요. 다시 도전해 보세요.",
    });
  }

  const updated = await applyLevelClear({
    userId: user.id,
    competency,
    levelId,
    xpGained,
    heartsLost: 0,
    alreadyCleared,
  });

  return NextResponse.json({
    ok: true,
    allCorrect: true,
    wrongCount: 0,
    xpGained,
    comboXp,
    hearts: updated.hearts,
    xp: updated.xp,
    theta: irt.theta,
    se: irt.se,
    results: graded.results,
    message: alreadyCleared
      ? "이미 클리어한 레벨이에요. 복습 완료!"
      : comboXp > 0
        ? `레벨 클리어! 콤보 보너스 +${comboXp} XP`
        : "레벨 클리어!",
  });
}
