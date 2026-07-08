/**
 * Expand global-competencies.json → L1–L5 × 3 questions (15) + multi-criterion rubrics.
 * Run: node scripts/expand-global-questions.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "../seed/global-competencies.json");
const raw = JSON.parse(readFileSync(path, "utf-8"));

const LEVEL_STEMS = {
  1: [
    (name) => `${name}과 관련해 최근에 했던 일 중 가장 기본적인 사례를 짧게 소개해 주세요.`,
    (name) => `${name}을(를) 발휘해야 했던 일상적인 업무 상황을 구체적으로 말해 주세요.`,
    (name) => `${name} 측면에서 아직 서툴렀던 경험을 인정한다면, 무엇을 배웠나요?`,
  ],
  2: [
    (name) => `${name}이(가) 필요한 상황에서 정해진 기준을 지키며 대응했던 경험을 말씀해 주세요.`,
    (name) => `${name} 관련 업무에서 실수·누락을 스스로 점검해 보완한 사례가 있나요?`,
    (name) => `${name}을(를) 발휘할 때 참고한 절차·자료·사람 자원을 어떻게 활용했나요?`,
  ],
  3: [
    (name, q1) => q1 || `${name}을(를) 보여 준 STAR 구조의 경험을 구체적으로 말씀해 주세요.`,
    (name, _q1, q2) => q2 || `${name} 관련해 갈등이 있던 상황에서 어떻게 풀어냈는지 말해 주세요.`,
    (name) => `${name}을(를) 발휘하기 위해 주변과 협의하며 결과를 낸 경험을 말씀해 주세요.`,
  ],
  4: [
    (name) => `${name} 관점에서 여러 이해관계자를 조율하며 성과를 낸 경험을 말씀해 주세요.`,
    (name) => `${name}을(를) 팀·부서 단위로 끌어올리기 위해 만든 절차나 기준이 있나요?`,
    (name) => `${name}이(가) 약한 동료·조직을 설득하거나 변화를 이끈 사례를 말해 주세요.`,
  ],
  5: [
    (name) => `${name}을(를) 조직 전략·문화 수준에서 설계하거나 표준화한 경험이 있나요?`,
    (name) => `장기적 리스크를 감수하면서까지 ${name} 기준으로 방향을 바꾼 경험을 말씀해 주세요.`,
    (name) => `${name} 측면에서 조직·산업에 남긴 유의미한 변화를 구체적 근거와 함께 설명해 주세요.`,
  ],
};

function expandRubricLines(oneLine, level) {
  const base = oneLine.trim();
  const extras = {
    1: ["의도가 행동으로 거의 연결되지 않는다", "피드백을 받아도 기준을 세우지 못한다"],
    2: ["최소한의 기준은 지키지만 주도성이 약하다", "점검·보완이 비정기적이다"],
    3: ["구체적 사례로 행동이 입증된다", "결과에 대한 자기 책임이 드러난다"],
    4: ["타인·조직에까지 영향을 미친다", "재사용 가능한 방법·기준을 남긴다"],
    5: ["전략·시스템에 반영된다", "장기적 가치와 위험을 균형 있게 다룬다"],
  };
  return [base, ...(extras[level] ?? [])];
}

function expandCompetency(comp) {
  const name = comp.nameKo;
  const existing = (comp.questions ?? []).map((q) => q.questionText);
  const q1 = existing[0];
  const q2 = existing[1];

  const questions = [];
  let sort = 1;
  for (const lv of [1, 2, 3, 4, 5]) {
    const stems = LEVEL_STEMS[lv];
    for (let i = 0; i < 3; i++) {
      const fn = stems[i];
      const text =
        lv === 3 && i === 0 && q1
          ? q1
          : lv === 3 && i === 1 && q2
            ? q2
            : fn(name, q1, q2);
      questions.push({
        externalId: `GLOB-${comp.code}-L${lv}-${String(i + 1).padStart(2, "0")}`,
        level: lv,
        questionText: text,
        sortOrder: sort++,
      });
    }
  }

  const levels = {};
  for (const [k, v] of Object.entries(comp.levels ?? {})) {
    const line = typeof v === "string" ? v : Array.isArray(v) ? v[0] : String(v);
    levels[k] = expandRubricLines(line, Number(k));
  }

  return { ...comp, levels, questions };
}

raw.version = 2;
raw.note =
  "Each competency: L1–L5 × 3 interview questions (15) + multi-criterion rubrics. Original 2 stems kept at L3.";
raw.clusters = raw.clusters.map((cl) => ({
  ...cl,
  competencies: cl.competencies.map(expandCompetency),
}));

writeFileSync(path, JSON.stringify(raw, null, 2) + "\n", "utf-8");
const nQ = raw.clusters.reduce(
  (a, cl) => a + cl.competencies.reduce((b, c) => b + c.questions.length, 0),
  0,
);
console.log(`Wrote ${path}: ${nQ} questions (expect 300)`);
