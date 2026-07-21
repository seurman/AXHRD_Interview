import type { CareerTrack, CompetencyLesson, LessonKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";
import { buildLessonCatalog, STAGE_LABELS_KO } from "./catalog";

export type PathCompetencySummary = {
  competency: CompetencyCode;
  titleKo: string;
  unlockedStage: number;
  masteryScore: number;
  streakDays: number;
  lastDrillAt: string | null;
  nextLesson: {
    id: string;
    stage: number;
    kind: LessonKind;
    titleKo: string;
    stageLabel: string;
  } | null;
};

/** DB 레슨을 카탈로그와 동기화 (idempotent upsert) */
export async function syncLessonCatalog(opts?: {
  force?: boolean;
}): Promise<{ upserted: number; total: number }> {
  const catalog = buildLessonCatalog();
  const count = await prisma.competencyLesson.count();
  if (!opts?.force && count >= catalog.length) {
    return { upserted: 0, total: count };
  }

  for (const lesson of catalog) {
    await prisma.competencyLesson.upsert({
      where: {
        competency_slug: {
          competency: lesson.competency,
          slug: lesson.slug,
        },
      },
      create: {
        competency: lesson.competency,
        track: lesson.track,
        stage: lesson.stage,
        kind: lesson.kind,
        slug: lesson.slug,
        titleKo: lesson.titleKo,
        bodyMd: lesson.bodyMd,
        quizJson: lesson.quizJson ?? undefined,
        sortOrder: lesson.sortOrder,
        published: true,
      },
      update: {
        titleKo: lesson.titleKo,
        bodyMd: lesson.bodyMd,
        quizJson: lesson.quizJson ?? undefined,
        stage: lesson.stage,
        kind: lesson.kind,
        track: lesson.track,
        sortOrder: lesson.sortOrder,
        published: true,
      },
    });
  }
  return { upserted: catalog.length, total: catalog.length };
}

/** DB에 레슨이 없으면(또는 카탈로그보다 적으면) upsert (idempotent) */
export async function ensureLessonCatalogSeeded(): Promise<number> {
  const result = await syncLessonCatalog({ force: false });
  return result.total;
}

function lessonVisibleForTrack(
  lesson: Pick<CompetencyLesson, "track">,
  track: CareerTrack,
): boolean {
  return lesson.track == null || lesson.track === track;
}

export async function getOrCreatePathProgress(
  userId: string,
  competency: string,
  track: CareerTrack,
) {
  return prisma.learningPathProgress.upsert({
    where: {
      userId_competency_track: { userId, competency, track },
    },
    create: { userId, competency, track, unlockedStage: 0 },
    update: {},
  });
}

export async function listPathOverview(
  userId: string,
  track: CareerTrack,
  opts?: { seed?: boolean },
): Promise<PathCompetencySummary[]> {
  // 대시보드 등 읽기 경로에서는 시드하지 않음 — pooler에서 42 upsert는 타임아웃 위험이 큼
  if (opts?.seed !== false) {
    await ensureLessonCatalogSeeded();
  }

  const [progressRows, lessons] = await Promise.all([
    prisma.learningPathProgress.findMany({
      where: { userId, track },
    }),
    prisma.competencyLesson.findMany({
      where: { published: true },
      orderBy: [{ competency: "asc" }, { stage: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const progressByComp = new Map(
    progressRows.map((p) => [p.competency, p] as const),
  );

  return COMPETENCY_CODES.map((competency) => {
    const progress = progressByComp.get(competency);
    const unlocked = progress?.unlockedStage ?? 0;
    const candidates = lessons.filter(
      (l) =>
        l.competency === competency &&
        lessonVisibleForTrack(l, track) &&
        l.stage <= unlocked + 1,
    );
    const next =
      candidates.find((l) => l.stage === unlocked) ??
      candidates.find((l) => l.stage === unlocked + 1) ??
      candidates[0] ??
      null;

    return {
      competency,
      titleKo: competencyLabelKo(competency),
      unlockedStage: unlocked,
      masteryScore: progress?.masteryScore ?? 0,
      streakDays: progress?.streakDays ?? 0,
      lastDrillAt: progress?.lastDrillAt?.toISOString() ?? null,
      nextLesson: next
        ? {
            id: next.id,
            stage: next.stage,
            kind: next.kind,
            titleKo: next.titleKo,
            stageLabel: STAGE_LABELS_KO[next.stage] ?? `Stage ${next.stage}`,
          }
        : null,
    };
  });
}

export async function getCompetencyPathDetail(
  userId: string,
  competency: CompetencyCode,
  track: CareerTrack,
) {
  await ensureLessonCatalogSeeded();
  const progress = await getOrCreatePathProgress(userId, competency, track);
  const lessons = await prisma.competencyLesson.findMany({
    where: {
      competency,
      published: true,
      OR: [{ track: null }, { track }],
    },
    orderBy: [{ stage: "asc" }, { sortOrder: "asc" }],
  });
  const completions = await prisma.lessonCompletion.findMany({
    where: {
      userId,
      lessonId: { in: lessons.map((l) => l.id) },
    },
  });
  const done = new Set(completions.map((c) => c.lessonId));

  return {
    competency,
    track,
    progress: {
      unlockedStage: progress.unlockedStage,
      streakDays: progress.streakDays,
      masteryScore: progress.masteryScore,
      lastDrillAt: progress.lastDrillAt?.toISOString() ?? null,
    },
    lessons: lessons.map((l) => ({
      id: l.id,
      stage: l.stage,
      kind: l.kind,
      slug: l.slug,
      titleKo: l.titleKo,
      bodyMd: l.bodyMd,
      quizJson: l.quizJson,
      stageLabel: STAGE_LABELS_KO[l.stage] ?? `Stage ${l.stage}`,
      /** unlockedStage까지 도전 가능 (시작 시 0 = 개념만) */
      locked: l.stage > progress.unlockedStage,
      completed: done.has(l.id),
    })),
  };
}

/** 레슨 완료 — 퀴즈 점수 반영, stage 해금, 스트릭 갱신 */
export async function completeLesson(params: {
  userId: string;
  lessonId: string;
  track: CareerTrack;
  quizScore?: number | null;
}) {
  const lesson = await prisma.competencyLesson.findUnique({
    where: { id: params.lessonId },
  });
  if (!lesson || !lesson.published) {
    throw new Error("레슨을 찾을 수 없습니다.");
  }
  if (lesson.track && lesson.track !== params.track) {
    throw new Error("현재 트랙에서 사용할 수 없는 레슨입니다.");
  }

  const progress = await getOrCreatePathProgress(
    params.userId,
    lesson.competency,
    params.track,
  );

  // stage 0부터: unlockedStage 이하는 도전 가능
  if (lesson.stage > progress.unlockedStage) {
    throw new Error("아직 해금되지 않은 단계입니다.");
  }

  const score =
    typeof params.quizScore === "number" && Number.isFinite(params.quizScore)
      ? Math.min(1, Math.max(0, params.quizScore))
      : null;

  await prisma.lessonCompletion.upsert({
    where: {
      userId_lessonId: {
        userId: params.userId,
        lessonId: lesson.id,
      },
    },
    create: {
      userId: params.userId,
      lessonId: lesson.id,
      score: score ?? undefined,
    },
    update: {
      score: score ?? undefined,
    },
  });

  await prisma.drillAttempt.create({
    data: {
      userId: params.userId,
      competency: lesson.competency,
      kind:
        lesson.kind === "CONCEPT" ||
        lesson.kind === "FRAMEWORK" ||
        lesson.kind === "CERTIFY"
          ? "quiz"
          : lesson.kind === "WEAKNESS_DRILL"
            ? "weakness"
            : "daily",
      lessonId: lesson.id,
      unscored: score == null,
      score: score ?? undefined,
    },
  });

  const unlockedStage = nextUnlockedStage({
    currentUnlocked: progress.unlockedStage,
    lessonStage: lesson.stage,
    kind: lesson.kind,
    quizScore: score,
  });

  const masterySample =
    lesson.kind === "CERTIFY"
      ? Math.max(score ?? 0, 0.85)
      : (score ?? 0.6);
  const masteryScore = blendMastery(progress.masteryScore, masterySample);
  const streakDays = bumpStreak(progress.lastDrillAt, progress.streakDays);

  const updated = await prisma.learningPathProgress.update({
    where: { id: progress.id },
    data: {
      unlockedStage,
      masteryScore,
      streakDays,
      lastDrillAt: new Date(),
    },
  });

  return {
    lessonId: lesson.id,
    competency: lesson.competency,
    unlockedStage: updated.unlockedStage,
    masteryScore: updated.masteryScore,
    streakDays: updated.streakDays,
  };
}

/** 스와이프 Save 후 말하기 — 저원가 드릴 기록 + 해당 역량 스트릭 */
export async function recordSwipeDrill(params: {
  userId: string;
  competency?: string | null;
  swipeId?: string | null;
  track: CareerTrack;
}) {
  await prisma.drillAttempt.create({
    data: {
      userId: params.userId,
      competency: params.competency ?? undefined,
      kind: "swipe",
      swipeId: params.swipeId ?? undefined,
      unscored: true,
    },
  });

  if (!params.competency) {
    return { recorded: true };
  }

  const progress = await getOrCreatePathProgress(
    params.userId,
    params.competency,
    params.track,
  );
  const streakDays = bumpStreak(progress.lastDrillAt, progress.streakDays);
  await prisma.learningPathProgress.update({
    where: { id: progress.id },
    data: {
      streakDays,
      lastDrillAt: new Date(),
      // 스테이지 해금은 레슨 완료로만 — 스와이프는 습관·숙련만 갱신
      masteryScore: blendMastery(progress.masteryScore, 0.55),
    },
  });
  return { recorded: true, competency: params.competency, streakDays };
}

/** 퀴즈 통과(>=0.7) 또는 비퀴즈 레슨이면 다음 stage 해금 */
export function nextUnlockedStage(params: {
  currentUnlocked: number;
  lessonStage: number;
  kind: LessonKind;
  quizScore: number | null;
}): number {
  const floor = Math.max(params.currentUnlocked, params.lessonStage);
  const needsQuiz =
    params.kind === "CONCEPT" ||
    params.kind === "FRAMEWORK" ||
    params.kind === "CERTIFY";
  const passed = needsQuiz ? (params.quizScore ?? 0) >= 0.7 : true;
  if (!passed) return floor;
  return Math.max(floor, Math.min(5, params.lessonStage + 1));
}

export function blendMastery(prev: number, sample: number): number {
  return Math.min(1, Math.round((prev * 0.7 + sample * 0.3) * 1000) / 1000);
}

export function bumpStreak(lastDrillAt: Date | null, streakDays: number): number {
  if (!lastDrillAt) return 1;
  const now = new Date();
  const last = new Date(lastDrillAt);
  const startToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startLast = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
  const diffDays = Math.round((startToday - startLast) / 86_400_000);
  if (diffDays === 0) return Math.max(1, streakDays);
  if (diffDays === 1) return streakDays + 1;
  return 1;
}

function competencyLabelKo(code: CompetencyCode): string {
  const map: Record<CompetencyCode, string> = {
    COMMUNICATION: "의사소통",
    PROBLEM_SOLVING: "문제해결",
    JOB_FIT: "직무적합",
    ORG_FIT: "조직적합",
    LEADERSHIP: "리더십",
    GROWTH: "성장",
  };
  return map[code] ?? code;
}

export async function resolveUserTrack(userId: string): Promise<CareerTrack> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { careerTrack: true },
  });
  return user?.careerTrack ?? "NEW_GRAD";
}
