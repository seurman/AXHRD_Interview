import { prisma } from "@/lib/prisma";
import { generateGeminiText } from "@/lib/gemini/client";

export type OpenTextTheme = {
  title: string;
  count: number;
  quotes: string[];
};

export type SubscaleThemeResult = {
  subscaleCode: string;
  subscaleName: string;
  totalResponses: number;
  themes: OpenTextTheme[];
  /** gemini=실제 테마 클러스터링, raw=API 키 없음/호출 실패로 원문만 노출, insufficient=응답 수 부족 */
  mode: "gemini" | "raw" | "insufficient";
};

export type OpenTextThemeReport = {
  sections: SubscaleThemeResult[];
  generatedWithGemini: boolean;
};

const MIN_QUOTES_FOR_THEMES = 5;
const MAX_QUOTES_PER_SUBSCALE = 40;

const THEME_SYSTEM = `당신은 조직진단 주관식 응답을 분석하는 HR 데이터 분석가입니다.
같은 주제(테마)로 묶이는 응답들을 2~4개 그룹으로 나누고, 각 그룹의 제목과 대표 인용문을 뽑습니다.

규칙:
- 응답에 실제로 없는 내용을 지어내지 마세요(할루시네이션 금지).
- 각 테마 제목은 10자 내외 한국어 명사구로.
- 대표 인용문은 원문 그대로(요약·윤색·의역 금지) 최대 2개, 실제 입력된 응답 중에서만 선택.
- count는 그 테마에 해당한다고 판단한 응답 개수(정수, 전체 응답 수를 넘지 않게).
- JSON만 반환: {"themes":[{"title":"...","count":0,"quotes":["...","..."]}]}`;

async function clusterWithGemini(quotes: string[]): Promise<OpenTextTheme[] | null> {
  const userPrompt = `다음은 조직진단 설문의 주관식 응답 ${quotes.length}건입니다. 테마별로 묶어주세요.\n\n${quotes
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n")}`;

  const content = await generateGeminiText({
    systemInstruction: THEME_SYSTEM,
    userPrompt,
    temperature: 0.2,
    maxOutputTokens: 800,
    timeoutMs: 15_000,
    task: "theme_mining",
    responseMimeType: "application/json",
  });
  if (!content) return null;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      themes?: Array<{ title?: string; count?: number; quotes?: string[] }>;
    };
    if (!Array.isArray(parsed.themes) || parsed.themes.length === 0) return null;
    const themes = parsed.themes
      .filter((t): t is { title: string; count?: number; quotes?: string[] } => !!t.title?.trim())
      .map((t) => ({
        title: t.title.trim(),
        count:
          typeof t.count === "number" && Number.isFinite(t.count) ? Math.max(0, Math.round(t.count)) : 0,
        quotes: Array.isArray(t.quotes)
          ? t.quotes.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 2)
          : [],
      }));
    return themes.length > 0 ? themes : null;
  } catch {
    return null;
  }
}

/**
 * 주관식(OPEN_TEXT) 답변을 서브스케일별로 모아 테마 클러스터링한다. 고전적 LDA 대신 Gemini로
 * 대체(혼합 방식 결정 — docs/STATUS.md 참고). GEMINI_API_KEY가 없거나 호출/파싱 실패 시
 * raw 모드로 폴백(원문 인용만 노출, 클러스터링 없음) — 조용히 가짜 테마를 만들지 않는다.
 * 응답량이 많을 수 있어 리포트 최초 로딩에 포함하지 않고 별도 API로 지연 호출한다.
 */
export async function analyzeOpenTextThemes(
  waveId: string,
  leafTeamIds: string[] | null,
): Promise<OpenTextThemeReport> {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { id: waveId },
    select: { instrumentId: true },
  });
  if (!wave) return { sections: [], generatedWithGemini: false };

  const items = await prisma.diagnosticItem.findMany({
    where: { section: { instrumentId: wave.instrumentId }, scaleType: "OPEN_TEXT" },
    include: { subscale: true },
  });
  if (items.length === 0) return { sections: [], generatedWithGemini: false };

  const itemIds = items.map((i) => i.id);
  const subscaleByItemId = new Map(
    items.map((i) => [i.id, i.subscale ? { code: i.subscale.code, name: i.subscale.nameKo } : null]),
  );

  const answers = await prisma.diagnosticAnswer.findMany({
    where: {
      itemId: { in: itemIds },
      axis: "CURRENT",
      textValue: { not: null },
      response: {
        waveId,
        submittedAt: { not: null },
        ...(leafTeamIds ? { teamId: { in: leafTeamIds } } : {}),
      },
    },
    select: { itemId: true, textValue: true },
  });

  const bySubscale = new Map<string, { name: string; quotes: string[] }>();
  for (const a of answers) {
    const text = a.textValue?.trim();
    if (!text) continue;
    const sub = subscaleByItemId.get(a.itemId);
    const code = sub?.code ?? "OTHER";
    const name = sub?.name ?? "기타";
    const entry = bySubscale.get(code) ?? { name, quotes: [] };
    entry.quotes.push(text);
    bySubscale.set(code, entry);
  }

  let usedGemini = false;
  const sections: SubscaleThemeResult[] = [];
  for (const [code, { name, quotes }] of bySubscale.entries()) {
    if (quotes.length < MIN_QUOTES_FOR_THEMES) {
      sections.push({
        subscaleCode: code,
        subscaleName: name,
        totalResponses: quotes.length,
        themes: [],
        mode: "insufficient",
      });
      continue;
    }

    const sample = quotes.slice(0, MAX_QUOTES_PER_SUBSCALE);
    const themes = process.env.GEMINI_API_KEY ? await clusterWithGemini(sample) : null;
    if (themes) {
      usedGemini = true;
      sections.push({
        subscaleCode: code,
        subscaleName: name,
        totalResponses: quotes.length,
        themes,
        mode: "gemini",
      });
    } else {
      sections.push({
        subscaleCode: code,
        subscaleName: name,
        totalResponses: quotes.length,
        themes: [{ title: "원문 인용(테마 분류 안 됨)", count: quotes.length, quotes: quotes.slice(0, 5) }],
        mode: "raw",
      });
    }
  }

  return {
    sections: sections.sort((a, b) => b.totalResponses - a.totalResponses),
    generatedWithGemini: usedGemini,
  };
}
