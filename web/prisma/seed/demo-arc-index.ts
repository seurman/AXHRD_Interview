/**
 * 고객 데모용 ARC Index 조직진단 시드 스크립트.
 *
 * 실제 문항(prisma/seed/arc-index-data.ts, DB에 이미 동기화된 DiagnosticItem)에 맞춰
 * 그럴듯한(plausible) 응답자 데이터를 생성해 — Wave 1 → Wave 2 두 웨이브, 5개 팀, 팀당 18~24명 —
 * /admin/diagnostic 리포트에서 실제 조직처럼 보이는 결과를 확인할 수 있게 한다.
 *
 * 주의: 정확한 통계 검증용이 아니라 "완성된 리포트가 이렇게 보인다"를 보여주기 위한 데모다.
 * 서사(내러티브)는 ARC 인덱스 보고서_v1.0 목업과 방향을 맞췄다 — 심리적안전·성과보상 낮음,
 * 문화·포용 높음(갭 없음), CV01(실행속도)만 Wave2에서 하락, 팀간 편차로 ICC 신호 발생 등.
 *
 * 조직 하이어라키(사업본부 → 사업부 → 팀) 데모: 5개 팀을 3개 사업본부(경영기획본부·연구개발본부·
 * 오퍼레이션본부) 산하 사업부로 묶어 생성 — 리포트 "팀" 탭의 전사 → 사업본부 → 사업부 → 팀 드릴다운을
 * 그대로 보여준다.
 *
 * 실행: cd web && npx tsx prisma/seed/demo-arc-index.ts
 * 결과 확인: /admin/diagnostic (슈퍼어드민 로그인 후) → "테크노바 (ARC 데모)" 웨이브 → 보고서
 */

import { randomUUID } from "crypto";
import { prisma } from "../../src/lib/prisma";
import { seedArcIndex } from "./arc-index";
import { createDiagnosticWave } from "../../src/lib/diagnostic/campaigns";

// ───────────────────────── 결정론적 PRNG (재현 가능한 데모) ─────────────────────────
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalish(rand: () => number, mean: number, sd: number): number {
  // 균등분포 3개 합 → 대략적인 종형분포(근사), 데모용으로 충분
  const u = (rand() + rand() + rand() - 1.5) / 1.5;
  return mean + u * sd * 1.8;
}

function clampLikert(v: number): number {
  return Math.min(5, Math.max(1, Math.round(v)));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ───────────────────────── 조직·팀 정의 ─────────────────────────

const DEMO_ORG_JOIN_CODE = "ARC-DEMO-2026";
const DEMO_ORG_NAME = "테크노바 (ARC 데모)";

type TeamDef = {
  name: string;
  department: string;
  /** 사업본부 — 리포트 드릴다운 데모용 3단 하이어라키(본부→사업부→팀) */
  divisionName: string;
  /** 사업부 */
  unitName: string;
  baseline: number;
  size: number;
};

// 3단 하이어라키(사업본부 → 사업부 → 팀) 데모 — /admin·/org 리포트의 "팀" 탭 드릴다운을 보여주기 위함.
const TEAMS: TeamDef[] = [
  {
    name: "전략기획팀",
    department: "기획부문",
    divisionName: "경영기획본부",
    unitName: "전략기획부",
    baseline: 0.75,
    size: 24,
  },
  {
    name: "연구1팀",
    department: "연구부문",
    divisionName: "연구개발본부",
    unitName: "연구1부",
    baseline: 0.35,
    size: 20,
  },
  {
    name: "사업개발팀",
    department: "사업부문",
    divisionName: "경영기획본부",
    unitName: "사업개발부",
    baseline: -0.05,
    size: 22,
  },
  {
    name: "지원행정팀",
    department: "지원부문",
    divisionName: "오퍼레이션본부",
    unitName: "지원운영부",
    baseline: -0.55,
    size: 18,
  },
  {
    name: "현장서비스A",
    department: "현장부문",
    divisionName: "오퍼레이션본부",
    unitName: "현장서비스부",
    baseline: -0.75,
    size: 20,
  },
];

// ───────────────────────── 구성원 유형(페르소나) ─────────────────────────

type Persona = { key: string; label: string; weight: number; offset: number };

const PERSONAS: Persona[] = [
  { key: "HIGH_ENGAGE", label: "고몰입형", weight: 0.28, offset: 0.55 },
  { key: "COMMITTED", label: "헌신·몰두형", weight: 0.3, offset: 0.15 },
  { key: "BURNOUT_RISK", label: "번아웃위험형", weight: 0.28, offset: -0.5 },
  { key: "FLIGHT_RISK", label: "이탈예고형", weight: 0.14, offset: -1.15 },
];

function pickPersona(rand: () => number): Persona {
  const r = rand();
  let acc = 0;
  for (const p of PERSONAS) {
    acc += p.weight;
    if (r <= acc) return p;
  }
  return PERSONAS[PERSONAS.length - 1];
}

const CENTER = 3.5;

// 조직 전체 공통 오프셋 — 팀·페르소나와 무관하게 항상 적용(시스템 문제 vs 개인차를 구분하기 위함)
const SYSTEMIC_OFFSET: Record<string, number> = {
  D: -0.05,
  SL: 0.15,
  SV: 0.05,
  PS: -0.4, // 심리적 안전 — 구조적으로 낮음
  C: -0.15,
  EM: -0.3, // 구조·자율권(행정과부하)
  PM: -0.9, // 성과·보상 — 가장 낮음, 갭 최대
  LG: 0.05,
  CI: 0.75, // 문화·포용 — 갭 없이 항상 높음
  WE: -0.15,
  E: 0,
  SEC: -0.1,
  F: 0.1,
  BO: -0.05,
  TL: 0.05,
};

// OHI 영역 코드(팀·페르소나 영향 큼)
const OHI_WEIGHT = 1.0;
// ORI/OAI 영역(팀·페르소나 영향 중간)
const ORI_OAI_WEIGHT = 0.35;

const ORI_TARGET: Record<string, number> = {
  CD: 3.35,
  LA: 3.2,
  AXS: 3.3,
  AXC: 3.15,
  AXA: 3.2, // 욕구
  AXG: 2.6, // 장벽(높을수록 공포 큼) — 역문항 아님, 그대로 저장
};

const OAI_TARGET: Record<string, number> = {
  SA: 2.9,
  EA: 3.1,
  OA: 2.95,
};

// OVI — Wave별 기준선(웨이브 전환 시 개선/악화 반영). CV01은 별도 처리(단독 하락).
const OVI_WAVE_TARGET: Record<string, [number, number]> = {
  HV: [2.6, 3.4],
  CV: [3.3, 3.15],
  AV: [2.3, 3.0],
};
const CV01_WAVE_TARGET: [number, number] = [3.6, 2.71];
const OVI_WEIGHT = 0.3;

// 자기보고 중요도(현재 vs 중요도 차트용) — OHI 드라이버에만 존재
const IMPORTANCE_TARGET: Record<string, number> = {
  D: 3.6,
  SL: 3.6,
  SV: 3.5,
  PS: 4.4,
  C: 3.8,
  EM: 3.3,
  PM: 4.3,
  LG: 3.4,
  CI: 3.0,
  WE: 3.1,
  E: 3.8,
  SEC: 3.8,
  F: 3.6,
  BO: 3.5,
  TL: 3.6,
};

// 주관식(OPEN_TEXT) 응답 뱅크 — 향후 LLM 테마 분석 데모용 소재
const OE_QUOTES: Record<string, string[]> = {
  PS: [
    "문제를 말하면 나만 튀는 사람이 된다는 느낌이 있다",
    "실수했을 때 질책보다 원인 분석을 먼저 해줬으면 한다",
    "회의에서 다른 의견을 내기 어려운 분위기다",
  ],
  PM: [
    "열심히 해도 어떻게 반영되는지 알 수 없다",
    "평가 기준이 공개되면 훨씬 납득이 될 것 같다",
    "AI 활용해서 성과를 냈는데 별도로 인정받지 못했다",
  ],
  EM: [
    "보고서 쓰는 시간이 실제 업무 시간보다 많다",
    "결재 단계가 너무 많아서 실행이 늦어진다",
    "부서 간 협업 요청이 자주 묵살된다",
  ],
  CV: [
    "AI 도구를 쓰라고는 하는데 어떻게 써야 하는지 교육이 없다",
    "새로운 프로세스가 현장에 반영되기까지 너무 오래 걸린다",
  ],
  CI: ["동료들 사이 신뢰는 높은 편이라고 생각한다", "배경과 상관없이 공정하게 대해주는 문화가 좋다"],
};

// ───────────────────────── 응답 생성 ─────────────────────────

type ScoredItem = {
  id: string;
  itemCode: string;
  isReversed: boolean;
  hasImportanceAxis: boolean;
  scaleType: string;
  subscaleCode: string | null;
};

function subscaleCodeOf(item: { subscale: { code: string } | null }): string | null {
  return item.subscale?.code ?? null;
}

function targetForCurrent(
  code: string,
  team: TeamDef,
  persona: Persona,
  waveIdx: number,
  rand: () => number,
): number {
  if (code === "CV01_SPECIAL") {
    const [w1, w2] = CV01_WAVE_TARGET;
    const base = waveIdx === 0 ? w1 : w2;
    return clamp15(base + team.baseline * OVI_WEIGHT + persona.offset * OVI_WEIGHT + normalish(rand, 0, 0.4));
  }
  if (code in OVI_WAVE_TARGET) {
    const [w1, w2] = OVI_WAVE_TARGET[code];
    const base = waveIdx === 0 ? w1 : w2;
    return clamp15(base + team.baseline * OVI_WEIGHT + persona.offset * OVI_WEIGHT + normalish(rand, 0, 0.45));
  }
  if (code in ORI_TARGET) {
    return clamp15(
      ORI_TARGET[code] + team.baseline * ORI_OAI_WEIGHT + persona.offset * ORI_OAI_WEIGHT + normalish(rand, 0, 0.45),
    );
  }
  if (code in OAI_TARGET) {
    return clamp15(
      OAI_TARGET[code] + team.baseline * ORI_OAI_WEIGHT + persona.offset * ORI_OAI_WEIGHT + normalish(rand, 0, 0.45),
    );
  }
  // OHI 영역(드라이버 + SE/BO/TL/D)
  const offset = SYSTEMIC_OFFSET[code] ?? 0;
  return clamp15(CENTER + offset + team.baseline * OHI_WEIGHT + persona.offset * OHI_WEIGHT + normalish(rand, 0, 0.4));
}

function clamp15(v: number): number {
  return Math.min(5, Math.max(1, v));
}

/** target(선호방향 1~5, 높을수록 좋음)을 실제 저장값으로 변환 — isReversed면 6-target */
function toStoredValue(target: number, isReversed: boolean): number {
  const good = clampLikert(target);
  return isReversed ? clampLikert(6 - good) : good;
}

async function createRespondent(
  db: import("@prisma/client").PrismaClient,
  opts: {
  waveId: string;
  teamId: string;
  teamDef: TeamDef;
  persona: Persona;
  waveIdx: number;
  scoredItems: ScoredItem[];
  oeItems: ScoredItem[];
  rand: () => number;
  submittedAt: Date;
}) {
  const { waveId, teamId, teamDef, persona, waveIdx, scoredItems, oeItems, rand, submittedAt } = opts;

  const response = await db.diagnosticResponse.create({
    data: {
      waveId,
      teamId,
      respondentToken: randomUUID(),
      consentAt: submittedAt,
      submittedAt,
    },
  });

  const answers: Array<{
    responseId: string;
    itemId: string;
    axis: "CURRENT" | "IMPORTANCE";
    numericValue: number;
  }> = [];

  for (const item of scoredItems) {
    const code = item.subscaleCode;
    if (!code) continue;
    const isCv01 = item.itemCode === "CV01";
    const targetCode = isCv01 ? "CV01_SPECIAL" : code;
    const target = targetForCurrent(targetCode, teamDef, persona, waveIdx, rand);
    answers.push({
      responseId: response.id,
      itemId: item.id,
      axis: "CURRENT",
      numericValue: toStoredValue(target, item.isReversed),
    });

    if (item.hasImportanceAxis) {
      const impBase = IMPORTANCE_TARGET[code] ?? 3.5;
      const imp = clamp15(impBase + teamDef.baseline * 0.15 + normalish(rand, 0, 0.4));
      answers.push({
        responseId: response.id,
        itemId: item.id,
        axis: "IMPORTANCE",
        numericValue: clampLikert(imp),
      });
    }
  }

  if (answers.length > 0) {
    await db.diagnosticAnswer.createMany({ data: answers, skipDuplicates: true });
  }

  // 주관식(OPEN_TEXT) — 일부 응답자만, 페르소나 성향에 맞는 문구 샘플링 (numericValue 대신 textValue)
  const oeRows: Array<{ responseId: string; itemId: string; axis: "CURRENT"; textValue: string }> = [];
  for (const oe of oeItems) {
    const code = oe.subscaleCode ?? "";
    const bank = OE_QUOTES[code];
    if (!bank || bank.length === 0) continue;
    if (rand() > 0.35) continue; // 응답률 35%
    const text = bank[Math.floor(rand() * bank.length)];
    oeRows.push({ responseId: response.id, itemId: oe.id, axis: "CURRENT", textValue: text });
  }
  if (oeRows.length > 0) {
    await db.diagnosticAnswer.createMany({ data: oeRows, skipDuplicates: true });
  }
}

async function upsertDemoOrg(db: import("@prisma/client").PrismaClient) {
  const existing = await db.organization.findUnique({ where: { joinCode: DEMO_ORG_JOIN_CODE } });
  if (existing) {
    // 재실행 시 깨끗하게 다시 생성 — 웨이브(팀·응답·답변은 cascade)만 삭제, 기관은 유지
    await db.diagnosticWave.deleteMany({ where: { organizationId: existing.id } });
    return existing;
  }
  return db.organization.create({
    data: {
      name: DEMO_ORG_NAME,
      kind: "HR_ENTERPRISE",
      joinCode: DEMO_ORG_JOIN_CODE,
      status: "APPROVED",
      approvedAt: new Date(),
      diagnosticEnabled: true,
    },
  });
}

export async function seedDemoArcIndex(
  client?: import("@prisma/client").PrismaClient,
  options?: { organizationId?: string; waveLabelPrefix?: string },
) {
  const db = client ?? prisma;
  const labelPrefix = options?.waveLabelPrefix ?? "데모";

  console.log("[demo-arc-index] ARC Index 문항 동기화 중…");
  const instrumentId = await seedArcIndex(db);

  console.log("[demo-arc-index] 데모 기관 준비 중…");
  let org: { id: string; name: string; joinCode: string };
  if (options?.organizationId) {
    const existing = await db.organization.findUnique({
      where: { id: options.organizationId },
      select: { id: true, name: true, joinCode: true, diagnosticEnabled: true },
    });
    if (!existing) throw new Error(`organization not found: ${options.organizationId}`);
    if (!existing.diagnosticEnabled) {
      await db.organization.update({
        where: { id: existing.id },
        data: { diagnosticEnabled: true, status: "APPROVED", approvedAt: new Date() },
      });
    }
    await db.diagnosticWave.deleteMany({ where: { organizationId: existing.id } });
    org = existing;
    console.log(`[demo-arc-index] 대상 기관: ${org.name}`);
  } else {
    org = await upsertDemoOrg(db);
  }

  const items = await db.diagnosticItem.findMany({
    where: { section: { instrumentId } },
    include: { subscale: true },
  });

  const scoredItems: ScoredItem[] = items
    .filter((i) => !i.isDemographic && i.scaleType !== "OPEN_TEXT")
    .map((i) => ({
      id: i.id,
      itemCode: i.itemCode,
      isReversed: i.isReversed,
      hasImportanceAxis: i.hasImportanceAxis,
      scaleType: i.scaleType,
      subscaleCode: subscaleCodeOf(i),
    }));

  const oeItems: ScoredItem[] = items
    .filter((i) => !i.isDemographic && i.scaleType === "OPEN_TEXT")
    .map((i) => ({
      id: i.id,
      itemCode: i.itemCode,
      isReversed: false,
      hasImportanceAxis: false,
      scaleType: i.scaleType,
      subscaleCode: subscaleCodeOf(i),
    }));

  console.log(
    `[demo-arc-index] 문항 ${scoredItems.length}개(Likert) + ${oeItems.length}개(주관식) 확인 — 응답 생성 시작`,
  );

  for (let waveIdx = 0; waveIdx < 2; waveIdx++) {
    const waveNumber = waveIdx + 1;
    const wave = await createDiagnosticWave({
      organizationId: org.id,
      instrumentId,
      label: `${labelPrefix} — Wave ${waveNumber}`,
      status: "CLOSED",
      opensAt: daysAgo(waveIdx === 0 ? 75 : 14),
      closesAt: daysAgo(waveIdx === 0 ? 60 : 3),
      teams: TEAMS.map((t) => ({
        name: t.name,
        department: t.department,
        divisionName: t.divisionName,
        unitName: t.unitName,
      })),
    }, db);

    const submittedAt = daysAgo(waveIdx === 0 ? 62 : 5);
    const rand = mulberry32(1000 + waveIdx * 7919);

    let respondentCount = 0;
    for (const team of wave.teams) {
      const teamDef = TEAMS.find((t) => t.name === team.name);
      if (!teamDef) continue;
      for (let p = 0; p < teamDef.size; p++) {
        const persona = pickPersona(rand);
        await createRespondent(db, {
          waveId: wave.id,
          teamId: team.id,
          teamDef,
          persona,
          waveIdx,
          scoredItems,
          oeItems,
          rand,
          submittedAt,
        });
        respondentCount++;
      }
    }
    console.log(`[demo-arc-index] Wave ${waveNumber} (${wave.slug}) — 응답자 ${respondentCount}명 생성 완료`);
  }

  console.log(
    `[demo-arc-index] 완료 — /admin/diagnostic 에서 "${org.name}" 조직을 확인하세요.`,
  );

  return {
    organizationId: org.id,
    organizationName: org.name,
    joinCode: org.joinCode,
    adminDiagnosticUrl: "/admin/diagnostic",
    orgDiagnosisUrl: "/org/diagnosis",
  };
}

async function main() {
  await seedDemoArcIndex();
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("demo-arc-index.ts");

if (invokedDirectly) {
  main()
    .catch((err) => {
      console.error("[demo-arc-index] 실패:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
