/**
 * 역량게임 카탈로그 — 의사소통
 *
 * 유닛1: 단일 미니게임으로 기초→익숙
 * 유닛2: 더 어려운 단일 + 혼합 레벨 (응용→보스)
 * 플레이 중 기법명 스포일러 금지 · 규칙은 explain에서만
 */

import type { CompetencyCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";
import { competencyLabel } from "@/lib/labels";
import type { GameCourse, GameLevel, GameUnit } from "./types";
import { resolveLevelGameType } from "./types";

function level(
  partial: Omit<GameLevel, "gameType"> & { gameType?: GameLevel["gameType"] },
): GameLevel {
  const gameType =
    partial.gameType ?? resolveLevelGameType(partial.items);
  return { ...partial, gameType };
}

const COMM_UNIT_1: GameUnit = {
  id: "communication-u1",
  competency: "COMMUNICATION",
  index: 0,
  titleKo: "면접관의 30초",
  subtitleKo: "한 가지 형식으로 감각을 익힙니다",
  levels: [
    level({
      id: "communication-u1-l1",
      unitId: "communication-u1",
      index: 0,
      titleKo: "의견이 갈렸을 때",
      skillRule: "conclusion_first",
      difficulty: 1,
      xpReward: 25,
      items: [
        {
          id: "comm-u1-l1-i1",
          gameType: "choice",
          skillRule: "conclusion_first",
          prompt: "‘팀과 의견이 달랐을 때’ 질문에, 가장 설득력 있는 시작은?",
          choices: [
            "일정 리스크를 줄이기 위해 데이터를 보여 설득했습니다.",
            "사실 그때 분위기가 좀 복잡했는데요…",
            "저는 원래 말을 잘해서요.",
            "팀이 잘못한 부분이 있었습니다.",
          ],
          answerIndex: 0,
          explain:
            "기법: 결론이 먼저. 첫 문장에 ‘무엇을 했는지’를 두면 면접관이 나머지를 듣습니다.",
        },
        {
          id: "comm-u1-l1-i2",
          gameType: "choice",
          skillRule: "conclusion_first",
          prompt: "‘갈등 상황에서 본인 역할’을 물었을 때, 질문 의도에 맞는 시작은?",
          choices: [
            "갈등 상황에서 제가 한 일은 역할 재분배를 제안한 것입니다.",
            "회사 비전이 좋아서 지원했습니다.",
            "스펙을 말씀드리면…",
            "잘 모르겠습니다만…",
          ],
          answerIndex: 0,
          explain:
            "기법: 결론이 먼저 + 질문 의도. 질문의 핵심 단어(갈등·역할)를 첫 문장에 받아칩니다.",
        },
        {
          id: "comm-u1-l1-i3",
          gameType: "choice",
          skillRule: "conclusion_first",
          prompt: "‘프로젝트가 늦어질 뻔했을 때’ 질문에 가장 강한 첫 문장은?",
          choices: [
            "마감 이틀 전 병목을 찾아 일정을 하루 앞당겼습니다.",
            "그때는 정말 힘들었습니다.",
            "팀원들이 열심히 했습니다.",
            "저는 항상 최선을 다합니다.",
          ],
          answerIndex: 0,
          explain:
            "기법: 결론이 먼저. 감정·수식어보다 ‘내가 한 일 + 결과 힌트’로 엽니다.",
        },
      ],
    }),
    level({
      id: "communication-u1-l2",
      unitId: "communication-u1",
      index: 1,
      titleKo: "이 답이 설득될까",
      skillRule: "good_vs_bad",
      difficulty: 1,
      xpReward: 25,
      items: [
        {
          id: "comm-u1-l2-i1",
          gameType: "swipe_judge",
          skillRule: "good_vs_bad",
          prompt: "‘갈등을 어떻게 설득했나요?’에 대한 답입니다. 괜찮은가요?",
          answerText:
            "일정 충돌이 있어 데모 리스크를 수치로 보여 주고, 역할 재분배를 제안해 하루를 앞당겼습니다.",
          isGood: true,
          explain: "기법: 좋은 답 판정. 결론·행동·결과가 한 문장에 있습니다.",
        },
        {
          id: "comm-u1-l2-i2",
          gameType: "swipe_judge",
          skillRule: "good_vs_bad",
          prompt: "같은 질문에 대한 답입니다. 괜찮은가요?",
          answerText:
            "팀이 워낙 바빠서요. 다들 힘들었고 분위기가 안 좋았습니다.",
          isGood: false,
          explain:
            "기법: 좋은 답 판정. 상황·감정만 있고 내가 한 행동·결과가 없습니다.",
        },
        {
          id: "comm-u1-l2-i3",
          gameType: "swipe_judge",
          skillRule: "good_vs_bad",
          prompt: "‘본인 기여가 뭐였나요?’에 대한 답입니다. 괜찮은가요?",
          answerText:
            "체크리스트를 만들어 온보딩 질문을 절반으로 줄였고, 시니어 시간을 주 4시간 아꼈습니다.",
          isGood: true,
          explain: "기법: 좋은 답 판정. 내가 한 일과 수치 결과가 분명합니다.",
        },
      ],
    }),
    level({
      id: "communication-u1-l3",
      unitId: "communication-u1",
      index: 2,
      titleKo: "한 문장으로 잇기",
      skillRule: "cause_result",
      difficulty: 2,
      xpReward: 35,
      items: [
        {
          id: "comm-u1-l3-i1",
          gameType: "fill_blank",
          skillRule: "cause_result",
          prompt: "빈칸을 채워 답이 ‘왜 → 무엇을 → 그래서’로 이어지게 하세요.",
          template: "일정이 충돌했기 때문에 ___했고, 결과는 ___였습니다.",
          blanks: [
            {
              options: ["역할 재분배를 제안", "화를 냄", "자리를 피함", "침묵함"],
              answerIndex: 0,
            },
            {
              options: ["데모 지연 해소", "관계가 악화", "업무 포기", "모름"],
              answerIndex: 0,
            },
          ],
          explain:
            "기법: 인과(때문에→행동→결과). 한 호흡에 연결되면 논리가 살아납니다.",
        },
        {
          id: "comm-u1-l3-i2",
          gameType: "fill_blank",
          skillRule: "cause_result",
          prompt: "빈칸을 채워 면접 답이 끊기지 않게 만드세요.",
          template: "로그가 부족했기 때문에 ___했고, 그 결과 ___했습니다.",
          blanks: [
            {
              options: [
                "재현 시나리오를 추가 수집",
                "추측만 공유",
                "이슈를 닫음",
                "다른 팀 탓을 함",
              ],
              answerIndex: 0,
            },
            {
              options: [
                "원인을 하루 만에 특정",
                "회의만 늘림",
                "고객에게 사과만 함",
                "일정을 무기한 연장",
              ],
              answerIndex: 0,
            },
          ],
          explain:
            "기법: 인과. ‘부족했다 → 내가 보완했다 → 결과가 났다’가 한 줄에 보여야 합니다.",
        },
        {
          id: "comm-u1-l3-i3",
          gameType: "fill_blank",
          skillRule: "cause_result",
          prompt: "빈칸을 골라 행동과 결과가 맞게 이어지게 하세요.",
          template: "우선순위가 흔들렸기 때문에 ___했고, 결국 ___했습니다.",
          blanks: [
            {
              options: [
                "주간 목표를 3개로 제한",
                "모든 요청을 수락",
                "야근만 늘림",
                "의사결정을 미룸",
              ],
              answerIndex: 0,
            },
            {
              options: [
                "핵심 기능 출시를 지킴",
                "범위가 더 커짐",
                "품질이 떨어짐",
                "팀 이탈이 생김",
              ],
              answerIndex: 0,
            },
          ],
          explain:
            "기법: 인과. 원인에 맞는 행동과, 그 행동으로 설명 가능한 결과를 고릅니다.",
        },
      ],
    }),
    level({
      id: "communication-u1-l4",
      unitId: "communication-u1",
      index: 3,
      titleKo: "데모가 밀리던 날",
      skillRule: "star_order",
      difficulty: 2,
      xpReward: 40,
      items: [
        {
          id: "comm-u1-l4-i1",
          gameType: "order",
          skillRule: "star_order",
          prompt: "면접에서 이 경험을 이야기한다면, 어떤 순서가 가장 자연스러울까요?",
          cards: [
            "데모가 이틀 밀릴 위기에 팀 일정이 충돌했다",
            "역할 재분배와 일일 체크인을 제안했다",
            "반발하는 팀원에게 리스크 수치를 공유했다",
            "데모를 하루 앞당겨 릴리스했다",
          ],
          answerOrder: [0, 1, 2, 3],
          explain:
            "기법: STAR. 상황 → 내가 한 제안(행동) → 설득 행동 → 결과 순이 기본입니다.",
        },
        {
          id: "comm-u1-l4-i2",
          gameType: "order",
          skillRule: "star_order",
          prompt: "고객 클레임 대응 경험을 말할 때, 이야기 순서를 맞춰 보세요.",
          cards: [
            "출시 직후 동일 오류 문의가 하루 20건 들어왔다",
            "임시 우회 가이드를 만들고 원인 로그를 추적했다",
            "담당 개발과 우선순위를 다시 합의했다",
            "48시간 안에 패치를 배포하고 재문의가 줄었다",
          ],
          answerOrder: [0, 1, 2, 3],
          explain:
            "기법: STAR. 상황(문제) → 행동 → 협업 행동 → 결과·수치 순으로 쌓습니다.",
        },
        {
          id: "comm-u1-l4-i3",
          gameType: "order",
          skillRule: "star_order",
          prompt: "신규 입사자가 헤매던 온보딩 경험을 말할 때 맞는 순서는?",
          cards: [
            "입사 2주 차에 문서가 흩어져 질문이 폭주했다",
            "체크리스트와 주간 페어 온보딩을 제안했다",
            "시니어 리소스 부담을 수치로 공유해 합의를 얻었다",
            "평균 온보딩 질문 건수가 절반으로 줄었다",
          ],
          answerOrder: [0, 1, 2, 3],
          explain:
            "기법: STAR. ‘무슨 일이 있었고 → 무엇을 했고 → 어떻게 설득했고 → 결과가 어땠는지’.",
        },
      ],
    }),
    level({
      id: "communication-u1-l5",
      unitId: "communication-u1",
      index: 4,
      titleKo: "소리 내어 한 번",
      skillRule: "speak_compress",
      difficulty: 2,
      xpReward: 40,
      items: [
        {
          id: "comm-u1-l5-i1",
          gameType: "speak_along",
          skillRule: "speak_compress",
          prompt: "아래 문장을 소리 내어 따라 말해 보세요. (채점 없음)",
          script:
            "일정 충돌로 데모가 밀릴 위기에서 역할 재분배를 제안해 하루를 앞당겼습니다. 반발에는 리스크 수치를 공유해 설득했습니다.",
          tip: "숫자(하루)와 ‘내가 한 일’을 또렷이. 끝나면 첫 문장만 다시 한 번.",
        },
        {
          id: "comm-u1-l5-i2",
          gameType: "speak_along",
          skillRule: "speak_compress",
          prompt: "이 문장도 같은 호흡으로 따라 말해 보세요.",
          script:
            "출시 직후 문의가 하루 20건이라 우회 가이드를 만들고 로그를 추적해, 48시간 안에 패치를 배포했습니다.",
          tip: "호흡을 둘로: 문제+행동 / 결과. ‘20건·48시간’을 놓치지 마세요.",
        },
        {
          id: "comm-u1-l5-i3",
          gameType: "speak_along",
          skillRule: "speak_compress",
          prompt: "마지막 문장입니다. 또박또박 따라 말해 보세요.",
          script:
            "문서가 흩어져 질문이 폭주해 체크리스트와 페어 온보딩을 제안했고, 온보딩 질문이 절반으로 줄었어요.",
          tip: "압축 말하기. 상황→행동→결과를 한 호흡에 담습니다.",
        },
      ],
    }),
  ],
};

/** 유닛2: 난이도↑ + 혼합 미니게임 */
const COMM_UNIT_2: GameUnit = {
  id: "communication-u2",
  competency: "COMMUNICATION",
  index: 1,
  titleKo: "한 단계 더",
  subtitleKo: "함정이 늘고, 한 레벨에 여러 형식이 섞입니다",
  levels: [
    level({
      id: "communication-u2-l1",
      unitId: "communication-u2",
      index: 0,
      titleKo: "거의 비슷해 보이는 답",
      skillRule: "conclusion_first",
      difficulty: 3,
      xpReward: 45,
      items: [
        {
          id: "comm-u2-l1-i1",
          gameType: "choice",
          skillRule: "conclusion_first",
          prompt: "‘실패를 어떻게 수습했나요?’ — 가장 강한 시작은?",
          choices: [
            "장애 알림 후 15분 안에 롤백을 결정하고 영향 범위를 공유했습니다.",
            "실패는 누구에게나 있을 수 있다고 생각합니다.",
            "팀과 함께 열심히 밤을 새웠습니다.",
            "그날은 정말 긴장됐고 분위기가 무거웠습니다.",
          ],
          answerIndex: 0,
          explain:
            "기법: 결론이 먼저. 비슷한 톤의 답 중에서도 ‘행동+시간’이 있는 쪽이 이깁니다.",
        },
        {
          id: "comm-u2-l1-i2",
          gameType: "choice",
          skillRule: "ownership",
          prompt: "‘갈등의 원인은?’ — 책임감이 드러나는 답은?",
          choices: [
            "제가 요구사항을 늦게 정리해 일정 충돌이 커졌고, 이후 주간 합의 문서를 만들었습니다.",
            "상대 팀이 협조적이지 않았습니다.",
            "회사 프로세스가 원래 복잡합니다.",
            "운이 좋지 않았습니다.",
          ],
          answerIndex: 0,
          explain:
            "기법: 오너십. 탓보다 ‘내 기여한 원인 + 내가 고친 행동’이 설득력 있습니다.",
        },
        {
          id: "comm-u2-l1-i3",
          gameType: "choice",
          skillRule: "quantify",
          prompt: "‘성과를 숫자로’ — 가장 설득력 있는 문장은?",
          choices: [
            "배포 주기를 2주에서 1주로 줄여 핫픽스 대기 시간을 절반으로 줄였습니다.",
            "배포를 더 자주 하게 됐습니다.",
            "팀 분위기가 좋아졌습니다.",
            "프로세스를 개선했습니다.",
          ],
          answerIndex: 0,
          explain: "기법: 수치화. Before→After가 한 문장에 보여야 합니다.",
        },
      ],
    }),
    level({
      id: "communication-u2-l2",
      unitId: "communication-u2",
      index: 1,
      titleKo: "다섯 장면 맞추기",
      skillRule: "star_order",
      difficulty: 4,
      xpReward: 55,
      items: [
        {
          id: "comm-u2-l2-i1",
          gameType: "order",
          skillRule: "star_order",
          prompt: "장애 대응 경험을 이야기로 말한다면 순서는?",
          cards: [
            "결제 API 타임아웃이 점심 피크에 터졌다",
            "영향 상점 수를 집계해 임시 우회를 안내했다",
            "원인 커밋을 특정하고 롤백안을 제안했다",
            "관련 팀과 배포 창을 재합의했다",
            "복구 후 모니터링 임계값을 조정했다",
          ],
          answerOrder: [0, 1, 2, 3, 4],
          explain:
            "기법: STAR 확장. 상황 → 즉시 행동 → 원인 대응 → 협업 → 재발 방지.",
        },
        {
          id: "comm-u2-l2-i2",
          gameType: "order",
          skillRule: "star_order",
          prompt: "설득으로 일정을 지킨 경험을 이야기 순서로 배열하세요.",
          cards: [
            "마케팅 일정과 개발 일정이 이틀 어긋났다",
            "리스크를 표로 만들어 공유했다",
            "범위를 줄이는 대안을 제안했다",
            "이해관계자 합의를 받았다",
            "축소 범위로 약속일을 지켰다",
          ],
          answerOrder: [0, 1, 2, 3, 4],
          explain: "기법: STAR. 데이터→대안→합의→결과가 이어져야 설득 스토리입니다.",
        },
        {
          id: "comm-u2-l2-i3",
          gameType: "fill_blank",
          skillRule: "cause_result",
          prompt: "빈칸을 채워 논리 구멍을 없애세요. (보기 중 가까운 오답이 있습니다)",
          template: "피크 트래픽을 예상하지 못했기 때문에 ___했고, 결국 ___했습니다.",
          blanks: [
            {
              options: [
                "캐시·큐를 먼저 넣고 부하 테스트를 추가",
                "사과 메일만 발송",
                "기능을 몰래 제거",
                "모니터링을 끔",
              ],
              answerIndex: 0,
            },
            {
              options: [
                "다음 피크에서 타임아웃이 재발하지 않음",
                "같은 장애가 더 자주 남",
                "고객 신뢰만 회복됨",
                "일정이 무기한 연장됨",
              ],
              answerIndex: 0,
            },
          ],
          explain:
            "기법: 인과. 난이도가 오르면 ‘그럴듯한 오답’이 늘므로 행동↔결과를 맞춰야 합니다.",
        },
      ],
    }),
    level({
      id: "communication-u2-l3",
      unitId: "communication-u2",
      index: 2,
      titleKo: "실전 한 판",
      skillRule: "mixed_review",
      difficulty: 5,
      xpReward: 70,
      items: [
        {
          id: "comm-u2-l3-i1",
          gameType: "choice",
          skillRule: "question_intent",
          prompt: "‘협업에서 어려웠던 점’을 물었습니다. 의도에 맞는 시작은?",
          choices: [
            "협업에서 가장 어려웠던 건 우선순위 충돌이었고, 제가 한 일은 공유 보드로 합의를 만든 것입니다.",
            "저는 협업을 잘합니다.",
            "회사 문화가 중요하다고 봅니다.",
            "특별히 어려웠던 점은 없었습니다.",
          ],
          answerIndex: 0,
          explain: "기법: 질문 의도. 질문 단어를 받은 뒤 바로 내 행동으로 이어갑니다.",
        },
        {
          id: "comm-u2-l3-i2",
          gameType: "swipe_judge",
          skillRule: "good_vs_bad",
          prompt: "이 답이 면접에서 버틸까요?",
          answerText:
            "갈등이 있었지만 대화로 풀었습니다. 자세한 내용은 기억이 잘 안 납니다.",
          isGood: false,
          explain:
            "기법: 좋은 답 판정. 행동·결과가 없고 ‘기억 안 남’은 신뢰를 깎습니다.",
        },
        {
          id: "comm-u2-l3-i3",
          gameType: "order",
          skillRule: "star_order",
          prompt: "짧은 성공 스토리 순서를 맞추세요.",
          cards: [
            "신규 지표 대시보드 요청이 들어왔다",
            "핵심 3지표만 1차로 합의했다",
            "프로토타입을 이틀에 보여 줬다",
            "피드백 반영 후 팀 주간 리뷰에 채택됐다",
          ],
          answerOrder: [0, 1, 2, 3],
          explain: "기법: STAR. 요청→범위 합의→빠른 실행→채택 결과.",
        },
        {
          id: "comm-u2-l3-i4",
          gameType: "fill_blank",
          skillRule: "cause_result",
          prompt: "빈칸을 채우세요.",
          template: "요구가 넓었기 때문에 ___했고, 결과는 ___였습니다.",
          blanks: [
            {
              options: [
                "1차 범위를 3지표로 제한",
                "모든 요청을 수용",
                "일정을 거부",
                "다른 팀에 넘김",
              ],
              answerIndex: 0,
            },
            {
              options: [
                "주간 리뷰 채택",
                "무기한 지연",
                "관계 악화만",
                "지표 폐기",
              ],
              answerIndex: 0,
            },
          ],
          explain: "기법: 인과. 범위 제한(행동)이 채택(결과)을 설명합니다.",
        },
        {
          id: "comm-u2-l3-i5",
          gameType: "speak_along",
          skillRule: "speak_compress",
          prompt: "보스 라운드 — 소리 내어 한 호흡으로 말하세요.",
          script:
            "우선순위 충돌이 있어 공유 보드로 합의를 만들었고, 핵심 3지표만 1차로 올려 이틀 만에 프로토타입을 보여 채택됐습니다.",
          tip: "보스 복습: 결론→행동→수치·결과가 한 호흡에 들어가야 합니다.",
        },
      ],
    }),
  ],
};

function emptyCourse(competency: CompetencyCode): GameCourse {
  return {
    competency,
    titleKo: competencyLabel(competency),
    blurbKo: `${competencyLabel(competency)}을(를) 짧은 상황에서 연습합니다. 레벨이 오를수록 형식이 섞이고 어려워집니다.`,
    units:
      competency === "COMMUNICATION"
        ? [COMM_UNIT_1, COMM_UNIT_2]
        : [
            {
              id: `${competency.toLowerCase()}-u1`,
              competency,
              index: 0,
              titleKo: "준비 중",
              subtitleKo: "다음 단계에서 유닛이 열립니다",
              levels: [],
            },
          ],
  };
}

export const COMPETENCY_GAME_COURSES: Record<CompetencyCode, GameCourse> =
  Object.fromEntries(
    COMPETENCY_CODES.map((c) => [c, emptyCourse(c)]),
  ) as Record<CompetencyCode, GameCourse>;

export function listGameCourses(): GameCourse[] {
  return COMPETENCY_CODES.map((c) => COMPETENCY_GAME_COURSES[c]);
}

export function getGameCourse(competency: CompetencyCode): GameCourse {
  return COMPETENCY_GAME_COURSES[competency];
}

export function findGameLevel(levelId: string) {
  for (const course of listGameCourses()) {
    for (const unit of course.units) {
      const level = unit.levels.find((l) => l.id === levelId);
      if (level) return { course, unit, level };
    }
  }
  return null;
}

export function findGameItem(levelId: string, itemId: string) {
  const found = findGameLevel(levelId);
  if (!found) return null;
  const item = found.level.items.find((i) => i.id === itemId);
  if (!item) return null;
  return { ...found, item };
}
