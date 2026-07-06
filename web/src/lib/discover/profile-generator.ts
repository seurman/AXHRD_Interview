/**
 * 자기발견 인터뷰 리포트 생성 — 세션당 LLM 1회 (DeepSeek) 또는 결정론적 mock
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { competencyLabel } from "@/lib/labels";
import { extractQuote } from "@/lib/interview/feedback-helpers";
import {
  RIASEC_TYPES,
  SCHWARTZ_VALUES,
  VIA_STRENGTHS,
  schwartzLabel,
  viaLabel,
} from "@/lib/discover/taxonomies";
import { COMPETENCY_CODES } from "@/types";
import type { DiscoverProfileData } from "@/types/discover";

const DEEPSEEK_BASE = "https://api.deepseek.com";

const SYSTEM = `당신은 한국어로 자기이해를 돕는 성찰 코치입니다.
지원자가 자기발견 인터뷰에 남긴 답변들을 분석해 JSON만 출력하세요.

중요 원칙:
- 이것은 심리 진단·채용 평가가 아닙니다. 점수·등급·합격/불합격을 절대 쓰지 마세요.
- 임상적 용어(성격장애, 진단 등)를 쓰지 마세요.
- quote 필드는 지원자가 실제로 한 말을 답변에서 그대로 인용하세요(지어내지 마세요).
- 주민번호, 특정 개인 실명 비방 등 민감정보는 분석에서 제외하고 인용하지 마세요.
- 전문 용어(VIA, Schwartz 코드)는 JSON의 code 필드에만 쓰고, 사용자에게 보여줄 labelKo/explanation은 자연스러운 한국어로 쓰세요.
- 강점은 "발견" 톤, 약점은 "개선 여지"로 부드럽게 표현하세요.

VIA 24강점 (code → 한국어명):
${VIA_STRENGTHS.map((s) => `${s.code}: ${s.labelKo} (${s.virtueKo})`).join(", ")}

Schwartz 10가치 (code → 한국어명):
${SCHWARTZ_VALUES.map((v) => `${v.code}: ${v.labelKo}`).join(", ")}

NCS 6역량 (code → 한국어명):
${COMPETENCY_CODES.map((c) => `${c}: ${competencyLabel(c)}`).join(", ")}

반드시 JSON만:
{
  "strengths": [
    {"viaCode":"CREATIVITY","viaLabelKo":"창의성","virtueKo":"지혜","quote":"실제 인용","explanation":"왜 이 강점이 드러났는지 1-2문장"}
  ],
  "weaknesses": [
    {"area":"개선 여지 영역","suggestion":"부드러운 제안","quote":"관련 인용(선택)"}
  ],
  "values": [
    {"schwartzCode":"ACHIEVEMENT","schwartzLabelKo":"성취","quote":"실제 인용","explanation":"왜 이 가치가 드러났는지"}
  ],
  "competencySignals": [
    {"code":"COMMUNICATION","labelKo":"의사소통","signal":"답변에서 보이는 신호 1문장","quote":"실제 인용"}
  ],
  "narrativeSummary": "McAdams 스타일로 당신의 이야기를 관통하는 주제를 1문단(4-6문장)으로 요약",
  "riasecHint": {"code":"SOCIAL","labelKo":"사회형","note":"에너지 패턴에 대한 짧은 코멘트"} 또는 null
}

strengths는 상위 5개, values는 상위 3개, weaknesses는 2~3개, competencySignals는 6역량 중 실제로 신호가 보이는 것만(최대 6개).`;

export async function generateDiscoverProfile(params: {
  responses: Array<{ questionCode: string; questionText: string; answerText: string }>;
  userName?: string;
}): Promise<DiscoverProfileData> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return mockDiscoverProfile(params);

  const model = process.env.DEEPSEEK_REPORT_MODEL ?? "deepseek-chat";
  const userContent = JSON.stringify(
    {
      participant: params.userName ?? "참여자",
      responses: params.responses,
    },
    null,
    2
  );

  try {
    const res = await fetchWithTimeout(`${DEEPSEEK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 2048,
      }),
      timeoutMs: 30000,
      retries: 1,
    });

    if (!res.ok) {
      console.error("[DeepSeek discover-profile] HTTP", res.status, await res.text());
      return mockDiscoverProfile(params);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as DiscoverProfileData;
      return normalizeProfile(parsed);
    }
  } catch (e) {
    console.error("[DeepSeek discover-profile]", e);
  }

  return mockDiscoverProfile(params);
}

function normalizeProfile(raw: DiscoverProfileData): DiscoverProfileData {
  return {
    strengths: (raw.strengths ?? []).slice(0, 5).map((s) => ({
      ...s,
      viaLabelKo: s.viaLabelKo || viaLabel(s.viaCode),
    })),
    weaknesses: (raw.weaknesses ?? []).slice(0, 3),
    values: (raw.values ?? []).slice(0, 3).map((v) => ({
      ...v,
      schwartzLabelKo: v.schwartzLabelKo || schwartzLabel(v.schwartzCode),
    })),
    competencySignals: raw.competencySignals ?? [],
    narrativeSummary: raw.narrativeSummary?.trim() || "당신의 이야기 속에서 꾸준함과 성장에 대한 열망이 반복적으로 드러났습니다.",
    riasecHint: raw.riasecHint ?? null,
  };
}

/** 키워드 기반 결정론적 mock — API 키 없을 때 */
function mockDiscoverProfile(params: {
  responses: Array<{ questionCode: string; questionText: string; answerText: string }>;
}): DiscoverProfileData {
  const allText = params.responses.map((r) => r.answerText).join(" ");
  const answers = params.responses.filter((r) => r.answerText?.trim());

  const viaRules: Array<{ code: string; keywords: string[] }> = [
    { code: "PERSEVERANCE", keywords: ["버텼", "끝까지", "포기하지", "극복", "힘들"] },
    { code: "KINDNESS", keywords: ["도움", "함께", "배려", "돌봄", "나눔"] },
    { code: "CURIOSITY", keywords: ["배우", "관심", "탐구", "알고 싶", "호기심"] },
    { code: "LEADERSHIP", keywords: ["이끌", "주도", "팀", "조직", "책임"] },
    { code: "CREATIVITY", keywords: ["새로운", "아이디어", "만들", "창의", "혁신"] },
    { code: "GRATITUDE", keywords: ["감사", "고마", "소중", "감사했"] },
    { code: "HONESTY", keywords: ["솔직", "진심", "진정", "나다운"] },
    { code: "HOPE", keywords: ["희망", "미래", "되고 싶", "꿈"] },
  ];

  const schwartzRules: Array<{ code: string; keywords: string[] }> = [
    { code: "ACHIEVEMENT", keywords: ["성취", "목표", "달성", "결과", "자랑"] },
    { code: "SELF_DIRECTION", keywords: ["자율", "주도", "내 방식", "스스로"] },
    { code: "BENEVOLENCE", keywords: ["사람", "함께", "도움", "관계"] },
    { code: "SECURITY", keywords: ["안정", "안전", "확실"] },
    { code: "STIMULATION", keywords: ["도전", "새로운", "변화", "모험"] },
    { code: "UNIVERSALISM", keywords: ["사회", "의미", "기여", "가치"] },
  ];

  const ncsRules: Array<{ code: string; keywords: string[] }> = [
    { code: "COMMUNICATION", keywords: ["설명", "소통", "이야기", "전달", "발표"] },
    { code: "PROBLEM_SOLVING", keywords: ["해결", "문제", "방법", "분석"] },
    { code: "LEADERSHIP", keywords: ["이끌", "팀", "주도", "책임"] },
    { code: "GROWTH", keywords: ["배우", "성장", "발전", "노력"] },
    { code: "ORG_FIT", keywords: ["협력", "함께", "조직", "문화"] },
    { code: "JOB_FIT", keywords: ["전문", "기술", "실무", "경험"] },
  ];

  const scoreKeywords = (rules: Array<{ code: string; keywords: string[] }>) =>
    rules
      .map((r) => ({
        code: r.code,
        score: r.keywords.filter((k) => allText.includes(k)).length,
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

  const viaScores = scoreKeywords(viaRules);
  const schwartzScores = scoreKeywords(schwartzRules);
  const ncsScores = scoreKeywords(ncsRules);

  const pickQuote = (answer?: string) =>
    answer?.trim() ? extractQuote(answer) : extractQuote(allText);

  const defaultAnswer = answers[0]?.answerText ?? allText;

  const strengths = (viaScores.length ? viaScores : [{ code: "PERSEVERANCE", score: 1 }])
    .slice(0, 5)
    .map((v) => {
      const meta = VIA_STRENGTHS.find((s) => s.code === v.code)!;
      return {
        viaCode: v.code,
        viaLabelKo: meta.labelKo,
        virtueKo: meta.virtueKo,
        quote: pickQuote(answers.find((a) => viaRules.find((r) => r.code === v.code)?.keywords.some((k) => a.answerText.includes(k)))?.answerText ?? defaultAnswer),
        explanation: `답변 속에서 '${meta.labelKo}'이 드러나는 패턴이 보입니다.`,
      };
    });

  const values = (schwartzScores.length ? schwartzScores : [{ code: "ACHIEVEMENT", score: 1 }])
    .slice(0, 3)
    .map((v) => ({
      schwartzCode: v.code,
      schwartzLabelKo: schwartzLabel(v.code),
      quote: pickQuote(defaultAnswer),
      explanation: `중요한 선택과 이야기 속에서 '${schwartzLabel(v.code)}' 가치가 반복적으로 나타납니다.`,
    }));

  const competencySignals = (ncsScores.length ? ncsScores : [{ code: "GROWTH", score: 1 }])
    .slice(0, 4)
    .map((n) => ({
      code: n.code,
      labelKo: competencyLabel(n.code),
      signal: `답변에서 ${competencyLabel(n.code)}과 연결되는 경험이 보입니다.`,
      quote: pickQuote(defaultAnswer),
    }));

  const weaknesses: DiscoverProfileData["weaknesses"] = [];
  if (!allText.match(/수치|%/)) {
    weaknesses.push({
      area: "경험의 구체성",
      suggestion: "숫자나 기간을 곁들이면 자신의 이야기가 더 선명해집니다.",
      quote: pickQuote(defaultAnswer),
    });
  }
  if (answers.length < 5) {
    weaknesses.push({
      area: "이야기의 깊이",
      suggestion: "한 경험을 상황-행동-결과 순으로 조금 더 풀어 쓰면 강점이 더 잘 드러납니다.",
    });
  }
  if (weaknesses.length === 0) {
    weaknesses.push({
      area: "다양한 관점",
      suggestion: "같은 경험을 다른 사람의 시각에서도 한 번 돌아보면 새로운 강점을 발견할 수 있습니다.",
    });
  }

  const riasecRules = [
    { code: "SOCIAL", keywords: ["사람", "함께", "소통", "돕"] },
    { code: "INVESTIGATIVE", keywords: ["분석", "탐구", "연구", "이해"] },
    { code: "ARTISTIC", keywords: ["창의", "표현", "디자인", "만들"] },
    { code: "ENTERPRISING", keywords: ["리더", "사업", "설득", "성과"] },
  ];
  const riasecHit = scoreKeywords(riasecRules)[0];
  const riasecMeta = RIASEC_TYPES.find((r) => r.code === riasecHit?.code);

  return {
    strengths,
    weaknesses: weaknesses.slice(0, 3),
    values,
    competencySignals,
    narrativeSummary:
      answers.length > 0
        ? `당신의 이야기를 들어보면, 어려운 순간을 견디며 성장해 온 경험과 앞으로 더 나은 모습을 향한 열망이 함께 흐르고 있습니다. 자랑스러웠던 순간과 전환점에서 드러난 선택은, 무엇을 소중히 여기는지 보여 줍니다. 이 대화는 평가가 아니라, 그동안 쌓아 온 자기 서사를 다시 바라보는 시간이었습니다.`
        : "아직 충분한 답변이 없어 일반적인 성찰 요약을 제공합니다. 조금 더 이야기를 나누면 더 풍부한 발견이 가능합니다.",
    riasecHint: riasecMeta
      ? { code: riasecMeta.code, labelKo: riasecMeta.labelKo, note: "에너지가 나는 활동 패턴과 연결될 수 있습니다." }
      : null,
  };
}
