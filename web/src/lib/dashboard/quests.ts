import type { QuestItem } from "@/components/dashboard/QuestPanel";

export function buildCareerQuests(params: {
  sessionCount: number;
  hasDiscover: boolean;
  hasSwipeToday?: boolean;
  hasPathDrillToday?: boolean;
  weakestCompetency?: string;
}): { quests: QuestItem[]; totalXp: number; level: number } {
  const quests: QuestItem[] = [
    {
      id: "discover",
      title: "나를 발견하기",
      description: "자기발견 인터뷰로 강점 카드 5장 획득",
      href: "/discover",
      xp: 150,
      done: params.hasDiscover,
      icon: "🃏",
    },
    {
      id: "interview",
      title: "역량 면접 1회",
      description: params.weakestCompetency
        ? `취약 역량(${params.weakestCompetency}) 집중 연습`
        : "IRT 적응형 모의 면접 완료",
      href: "/interview/setup",
      xp: 200,
      done: params.sessionCount > 0,
      icon: "🎤",
    },
    {
      id: "path",
      title: "역량 학습 1단계",
      description: "개념·원리 레슨으로 오늘 드릴 이어가기",
      href: "/practice/path",
      xp: 60,
      done: !!params.hasPathDrillToday,
      icon: "🧭",
    },
    {
      id: "swipe",
      title: "질문 카드 10장",
      description: "실전 질문 카드로 습관 만들기",
      href: "/practice/swipe",
      xp: 80,
      done: !!params.hasSwipeToday,
      icon: "📇",
    },
    {
      id: "certificate",
      title: "역량 인증서 공유",
      description: "포트폴리오 링크로 역량 프로필보내기",
      href: "/profile/certificate",
      xp: 100,
      done: params.sessionCount >= 3,
      icon: "📜",
    },
  ];

  const totalXp =
    (params.hasDiscover ? 150 : 0) +
    Math.min(params.sessionCount, 10) * 200 +
    (params.hasPathDrillToday ? 60 : 0) +
    (params.hasSwipeToday ? 80 : 0) +
    (params.sessionCount >= 3 ? 100 : 0);

  const level = Math.floor(totalXp / 500) + 1;

  return { quests, totalXp, level };
}
