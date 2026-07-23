import { prisma } from "@/lib/prisma";
import { buildInterviewAdvice } from "@/lib/discover/interview-advice";
import type {
  DiscoverInterviewAdvice,
  DiscoverProfileData,
  DiscoverStrengthItem,
} from "@/types/discover";

export interface UserStrengthDeck {
  strengths: DiscoverStrengthItem[];
  interviewAdvice: DiscoverInterviewAdvice[];
  narrativeSummary: string | null;
  completedAt: Date | null;
  sessionId: string;
  totalDiscovered: number;
}

/** 최신 완료된 자기발견 세션에서 강점 카드·면접 조언 로드 */
export async function getUserStrengthDeck(userId: string): Promise<UserStrengthDeck | null> {
  const session = await prisma.selfDiscoverySession.findFirst({
    where: { userId, status: "COMPLETED", profile: { isNot: null } },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      completedAt: true,
      profile: {
        select: {
          strengths: true,
          interviewAdvice: true,
          narrativeSummary: true,
        },
      },
      user: {
        select: {
          profile: { select: { desiredJobRole: true } },
        },
      },
    },
  });

  if (!session?.profile) return null;

  const rawStrengths = session.profile.strengths;
  const strengths = Array.isArray(rawStrengths)
    ? (rawStrengths as unknown as DiscoverStrengthItem[])
    : [];
  const rawAdvice = session.profile.interviewAdvice;
  const storedAdvice = Array.isArray(rawAdvice)
    ? (rawAdvice as unknown as DiscoverInterviewAdvice[])
    : null;

  const jobRole = session.user.profile?.desiredJobRole ?? "OTHER";
  let interviewAdvice: DiscoverInterviewAdvice[] = storedAdvice?.length
    ? storedAdvice
    : [];
  if (interviewAdvice.length === 0 && strengths.length > 0) {
    try {
      interviewAdvice = buildInterviewAdvice(strengths, jobRole);
    } catch (e) {
      console.error("[getUserStrengthDeck] buildInterviewAdvice", e);
      interviewAdvice = [];
    }
  }

  return {
    strengths,
    interviewAdvice,
    narrativeSummary: session.profile.narrativeSummary,
    completedAt: session.completedAt,
    sessionId: session.id,
    totalDiscovered: strengths.length,
  };
}

export function toDiscoverProfileData(
  profile: {
    strengths: unknown;
    weaknesses: unknown;
    values: unknown;
    competencySignals: unknown;
    interviewAdvice?: unknown;
    narrativeSummary: string;
  },
  jobRoleFallback?: Parameters<typeof buildInterviewAdvice>[1]
): DiscoverProfileData {
  const strengths = profile.strengths as DiscoverStrengthItem[];
  const storedAdvice = profile.interviewAdvice as DiscoverInterviewAdvice[] | null;

  return {
    strengths,
    weaknesses: profile.weaknesses as DiscoverProfileData["weaknesses"],
    values: profile.values as DiscoverProfileData["values"],
    competencySignals: profile.competencySignals as DiscoverProfileData["competencySignals"],
    narrativeSummary: profile.narrativeSummary,
    interviewAdvice:
      storedAdvice?.length
        ? storedAdvice
        : jobRoleFallback
          ? buildInterviewAdvice(strengths, jobRoleFallback)
          : undefined,
  };
}
