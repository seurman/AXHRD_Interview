/**
 * Apply Denison-style mid-length stems to Full + Summary seeds.
 */
import fs from "fs";
import path from "path";

/** Professional OD-level Korean stems (~30–45자 중심). */
const PRO_STEMS: Record<string, string> = {
  E01: "매일 아침 나는 업무에 대한 의욕과 에너지를 느낀다",
  E02: "나는 하루 종일 업무에 필요한 에너지를 유지할 수 있다",
  SEC01: "내 업무는 나에게 깊은 의미와 성취감을 준다",
  SEC03: "나는 이 조직의 미래가 나의 미래와 연결되어 있다고 느낀다",
  F01: "일을 할 때 나는 완전히 집중하여 시간 가는 줄 모를 때가 있다",
  F02: "업무를 할 때 나는 다른 모든 것을 잊고 완전히 몰두하는 경우가 있다",
  SE_OE: "이 조직에서 일하면서 가장 의미 있는 것과 가장 힘든 것은 무엇입니까?",
  BO01: "나는 지난 3개월간 업무 개선이나 새로운 아이디어를 자발적으로 제안한 적이 있다",
  BO03: "나는 이 조직에서 중요한 문제가 있을 때 침묵하지 않고 목소리를 낸다",
  TL01: "우리 팀 리더는 내가 어려운 상황에 처했을 때 나를 지지해줄 것이라고 믿는다",
  TL02: "우리 팀 리더는 팀원 각자의 역량과 판단을 진심으로 존중한다",
  TL03: "우리 팀 리더는 내 강점과 성장 가능성에 관심을 갖고 구체적으로 지원한다",
  TL04: "우리 팀 리더는 내 성과에 대해 도움이 되는 피드백을 적시에 준다",
  TL05: "우리 팀 리더 앞에서 나는 모르는 것을 모른다고 편하게 말할 수 있다",
  TL06: "우리 팀에서 새로운 시도가 잘 안 되더라도 그것이 불이익으로 돌아오지 않는다",
  TL_OE: "우리 팀 리더십에서 가장 힘이 되는 것과 아쉬운 것은 무엇입니까?",
  SL01: "경영진은 조직이 나아갈 방향과 그 의미를 명확히 제시한다",
  SL02: "경영진의 말과 실제 의사결정·자원 배분이 일치한다고 느낀다",
  SV02: "직속 상사는 내가 일을 잘할 수 있도록 충분히 지원한다",
  SV03: "직속 상사는 내 성과 향상에 도움이 되는 피드백을 준다",
  PS01: "이 조직에서 나는 어려운 문제나 불편한 진실을 편하게 꺼낼 수 있다",
  PS02: "이 조직에서 위험을 감수하는 새로운 시도를 해도 안전하다고 느낀다",
  C01: "업무 판단에 필요한 정보가 제때에 원활하게 나에게 공유된다",
  C02: "나는 내 의견을 조직 윗선에 솔직하게 전달할 수 있다",
  EM01: "업무를 잘 수행하는 데 필요한 의사결정 권한이 나에게 있다",
  EM02: "부서가 달라도 공동 목표를 위해 협업이 실제로 원활하게 이루어진다",
  PM01: "나의 성과는 기여도에 비례하여 공정하게 평가된다",
  PM04: "AI 결과물을 그대로 쓰지 않고 검토·검증하는 태도가 이 조직에서 성과로 인정받는다",
  LG01: "이 조직에서 나는 지속적으로 성장하고 있다고 느낀다",
  LG02: "업무 중 새로운 것을 배울 기회가 충분히 주어진다",
  CI01: "이 조직의 구성원들은 서로 존중하고 품위 있게 대한다",
  CI02: "이 조직은 배경이나 출신에 상관없이 모든 구성원을 공정하게 대한다",
  WE01: "업무에 필요한 도구·장비·자원이 충분히 갖춰져 있다",
  WE02: "나는 과도한 업무량으로 인해 지속적으로 지쳐있지 않다",
  CD01: "우리 조직은 앞으로 어떻게 변화해야 하는지 방향이 명확하다",
  CD02: "우리 조직의 구성원들은 변화하지 않으면 뒤처진다는 긴장감을 공유하고 있다",
  CD04: "우리 조직에서 오래된 관행을 바꾸는 것은 매우 어렵다",
  CD05: "조직의 경영진은 변화를 성공적으로 이끌어갈 능력이 있다고 신뢰한다",
  CD_OE: "변화 준비에서 가장 잘 되는 것과 가장 시급한 것은 무엇입니까?",
  LA01: "우리 조직은 과거 경험으로부터 조직 차원에서 실제로 배운다",
  LA02: "우리 조직은 다가오는 변화에 필요한 역량을 미리 개발하고 있다",
  LA03: "구성원들이 새로운 업무 방식을 시도할 심리적·제도적 여건이 있다",
  AXS01: "우리 조직은 AI·디지털 전환에 대한 명확한 방향과 전략을 갖고 있다",
  AXS02: "AI 활용에 대한 명확한 윤리 기준과 가이드라인이 실제로 작동한다",
  AXS04: "내 역할에서 AI가 맡아야 할 일과 내가 반드시 해야 할 일의 경계가 명확하다",
  AXC01: "나는 AI 도구를 업무에 실제로 활용할 수 있는 역량을 갖추고 있다",
  AXC02: "나는 AI가 제공한 결과물이 틀렸을 때 그 이유를 파악하고 수정할 수 있다",
  AXC04: "우리 팀에서 AI를 잘 모른다고 말해도 부끄럽거나 불이익이 없다",
  AXA01: "나는 AI 도구를 지금보다 업무에 더 많이 활용하고 싶다",
  AXA02: "AI를 더 잘 활용하면 내 커리어와 전문성 향상에 도움이 된다고 생각한다",
  AXG01: "AI를 사용하다 문제가 생기면 내가 책임져야 한다는 부담을 느낀다",
  AXG02: "AI 활용에 대한 명확한 가이드라인이 없어서 어떻게 써야 할지 막막하다",
  OPP_OE: "AI를 더 잘 활용하기 위해 조직이 가장 먼저 해야 할 것은 무엇입니까?",
  HV01: "지난 6개월과 비교해서 우리 조직의 리더십이 더 나아지고 있다고 느낀다",
  HV02: "지난 6개월과 비교해서 구성원들이 의견을 말하는 것이 더 편해졌다고 느낀다",
  HV_OE: "지난 6개월간 가장 눈에 띄게 좋아진 것과 가장 아쉬운 것은 무엇입니까?",
  CV01: "우리 조직에서 변화가 결정되고 현장에 실제로 적용되는 속도는 어느 정도인가?",
  CV03: "지난 6개월과 비교해서 불필요한 관행이나 절차가 실제로 줄어들고 있다",
  AV01: "지난 6개월과 비교해서 AI 도구 활용이 우리 조직에 더 넓게 퍼지고 있다",
  AV02: "지난 6개월과 비교해서 AI 때문에 실제로 업무 방식이 달라지고 있다",
  SA01: "우리 조직의 일상적 업무는 조직의 핵심 전략 방향과 직접 연결되어 있다",
  SA02: "경영진이 강조하는 우선순위와 내가 실제로 시간을 쓰는 곳이 일치한다",
  EA01: "내가 가장 많은 에너지를 쏟는 일이 우리 조직에서 가장 중요한 일과 일치한다",
  EA02: "열심히 한 일이 조직이 원하는 방향의 결과로 이어지고 있다고 느낀다",
  OA01: "지난 6개월 우리 조직의 변화 노력이 처음 의도한 방향의 결과를 실제로 만들고 있다",
  OA06: "측정하고 보고하는 성과지표가 조직이 정말 원하는 방향의 성과를 반영한다",
  OA_OE:
    "우리 조직에서 의도한 대로 잘 작동하고 있는 변화와, 노력했는데 결과가 기대와 달리 나타나는 변화는 각각 무엇입니까?",
};

function patch(filePath: string): string[] {
  let src = fs.readFileSync(filePath, "utf8");
  const missing: string[] = [];
  for (const [code, text] of Object.entries(PRO_STEMS)) {
    const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    // Match itemCode then textKo whether single-line or multiline string
    const re = new RegExp(
      `(itemCode:\\s*"${code}"[\\s\\S]*?textKo:\\s*)(?:"(?:\\\\.|[^"\\\\])*"|\\n\\s*"(?:\\\\.|[^"\\\\])*")`,
    );
    if (!re.test(src)) {
      missing.push(code);
      continue;
    }
    src = src.replace(re, `$1"${escaped}"`);
  }
  fs.writeFileSync(filePath, src);
  return missing;
}

const fullPath = path.resolve(__dirname, "../prisma/seed/arc-index-data.ts");
const sumPath = path.resolve(__dirname, "../prisma/seed/arc-index-summary-data.ts");

let fullSrc = fs.readFileSync(fullPath, "utf8");
fullSrc = fullSrc.replace(
  /\* v[^\n]*/,
  "* v260715p — 문항 문장: 타 조직진단(Denison급) 중간 길이 · 의도·관찰가능성 명확",
);
fullSrc = fullSrc.replace(/version:\s*"[^"]+"/, 'version: "260715p"');
fs.writeFileSync(fullPath, fullSrc);

const m1 = patch(fullPath);
const m2 = patch(sumPath);

const lengths = Object.values(PRO_STEMS)
  .filter((t) => !t.includes("무엇입니까") && !t.includes("어느 정도인가"))
  .map((t) => [...t].length)
  .sort((a, b) => a - b);
const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;

console.log({
  missingFull: m1,
  missingSummary: m2,
  likertN: lengths.length,
  avg: Math.round(avg),
  median: lengths[Math.floor(lengths.length / 2)],
  min: lengths[0],
  max: lengths[lengths.length - 1],
});
