import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { findGameLevel } from "@/lib/competency-game/catalog";
import { gradeLevel } from "@/lib/competency-game/engine";
import {
  applyLevelClear,
  getOrCreateGameProgress,
  loseHeart,
} from "@/lib/competency-game/progress";
import type { CompetencyCode } from "@/types";
import type { GameAnswerPayload } from "@/lib/competency-game/types";

export const runtime = "nodejs";

type Body = {
  competency?: CompetencyCode;
  levelId?: string;
  answers?: GameAnswerPayload[];
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
      },
      { status: 429 },
    );
  }

  const { level } = found;
  const graded = gradeLevel(level, answers);
  const alreadyCleared = Array.isArray(progress.clearedLevelIds)
    ? (progress.clearedLevelIds as string[]).includes(levelId)
    : false;

  if (!graded.allCorrect) {
    const updated = await loseHeart(user.id, competency);
    const firstWrong = graded.results.find((r) => !r.correct);
    return NextResponse.json({
      ok: true,
      allCorrect: false,
      wrongCount: graded.wrongCount,
      xpGained: 0,
      hearts: updated.hearts,
      results: graded.results,
      message: firstWrong?.explain ?? "일부 문항이 아쉬워요. 다시 도전해 보세요.",
    });
  }

  const updated = await applyLevelClear({
    userId: user.id,
    competency,
    levelId,
    xpGained: alreadyCleared ? 0 : graded.xpTotal,
    heartsLost: 0,
    alreadyCleared,
  });

  return NextResponse.json({
    ok: true,
    allCorrect: true,
    wrongCount: 0,
    xpGained: alreadyCleared ? 0 : graded.xpTotal,
    hearts: updated.hearts,
    xp: updated.xp,
    results: graded.results,
    message: alreadyCleared
      ? "이미 클리어한 레벨이에요. 복습 완료!"
      : "레벨 클리어!",
  });
}
