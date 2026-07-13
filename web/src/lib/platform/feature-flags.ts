import { prisma } from "@/lib/prisma";

export const FEATURE_FLAG_KEYS = {
  RESUME_CLAIM_VERIFICATION: "resume_claim_verification",
  JD_BONUS_QUESTION: "jd_bonus_question",
  TRIPLE_FEEDBACK_MODE: "triple_feedback_mode",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[keyof typeof FEATURE_FLAG_KEYS];

const DEFAULT_FLAGS: Array<{
  key: FeatureFlagKey;
  label: string;
  description: string;
}> = [
  {
    key: FEATURE_FLAG_KEYS.RESUME_CLAIM_VERIFICATION,
    label: "자소서 진위 검증",
    description:
      "면접 중 자소서 경험 진술의 일관성을 확인하는 추가 질문. 민감 기능이라 필요 시 플랫폼 전체에서 즉시 비활성화할 수 있습니다.",
  },
  {
    key: FEATURE_FLAG_KEYS.JD_BONUS_QUESTION,
    label: "JD 보너스 질문",
    description: "채용공고(JD) 분석 결과를 바탕으로 역량 면접 후 추가 보너스 질문을 제공합니다.",
  },
  {
    key: FEATURE_FLAG_KEYS.TRIPLE_FEEDBACK_MODE,
    label: "트리플 피드백",
    description: "답변 직후 코치·면접관·동료 관점의 3중 피드백을 표시합니다.",
  },
];

export function isKnownFeatureFlagKey(key: string): key is FeatureFlagKey {
  return (Object.values(FEATURE_FLAG_KEYS) as string[]).includes(key);
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await prisma.platformFeatureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? true;
}

export async function getAllFeatureFlags() {
  await ensureDefaultFeatureFlags();
  return prisma.platformFeatureFlag.findMany({ orderBy: { key: "asc" } });
}

export async function getSessionFeatureFlags() {
  const [resumeClaimVerification, jdBonusQuestion, tripleFeedbackMode] = await Promise.all([
    isFeatureEnabled(FEATURE_FLAG_KEYS.RESUME_CLAIM_VERIFICATION),
    isFeatureEnabled(FEATURE_FLAG_KEYS.JD_BONUS_QUESTION),
    isFeatureEnabled(FEATURE_FLAG_KEYS.TRIPLE_FEEDBACK_MODE),
  ]);
  return { resumeClaimVerification, jdBonusQuestion, tripleFeedbackMode };
}

async function ensureDefaultFeatureFlags() {
  await Promise.all(
    DEFAULT_FLAGS.map((flag) =>
      prisma.platformFeatureFlag.upsert({
        where: { key: flag.key },
        create: {
          key: flag.key,
          label: flag.label,
          description: flag.description,
          enabled: true,
        },
        update: {},
      }),
    ),
  );
}
