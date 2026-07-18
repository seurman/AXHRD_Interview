/**
 * 고객 시연용 통합 데모 시드 — JSON 팩 업로드형 데이터 → DB
 *
 * Usage: cd web && npm run db:seed:demo
 *
 * 포함:
 * - 개인 대시보드 (6축·차수 요약·자기발견·자소서 청크) — dashboard-demo@demo.axhrd.local
 * - 기관 풀패키지 (진단·코호트·지원자) — arc-demo-admin@demo.axhrd.local
 * - 테크노바 ARC 풀 리포트 — 슈퍼어드민 /admin/diagnostic 전용
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { syncNcsCompetencyBank } from "../../src/lib/competency/ncs-bank-sync";
import { seedPersonalDashboardFromPack } from "../../src/lib/demo/seed-personal-dashboard";
import { seedCandidateScreeningDemo } from "../../src/lib/demo/seed-candidate-screening";
import { seedArcDemoOrgAdmin } from "../../src/lib/demo/seed-arc-org-admin";
import { ensureDemoAccountPasswords } from "../../src/lib/demo/seed-demo-passwords";
import { seedShowcaseDemoData } from "../../src/lib/platform/showcase-seed";
import { seedArcIndex } from "./arc-index";
import { seedDemoArcIndex } from "./demo-arc-index";
import { seedEvidenceAssessment } from "./evidence-assessment";
import access from "../../src/data/demo/demo-access.json";

const prisma = new PrismaClient();

export type DemoSuiteOptions = {
  /** 운영 통합 시드: 테크노바 ARC는 「운영 ARC 데모」로 별도 시드 (시간 절약) */
  skipTechnovaArc?: boolean;
};

export async function runDemoSuite(client: PrismaClient = prisma, options?: DemoSuiteOptions) {
  console.log("[demo-suite] ARC Index · NCS 동기화…");
  await seedArcIndex(client);
  await syncNcsCompetencyBank(client);

  console.log("[demo-suite] 쇼케이스 코호트·경량 진단…");
  const showcase = await seedShowcaseDemoData(client);

  console.log("[demo-suite] 개인 대시보드 팩 적용…");
  const dashboard = await seedPersonalDashboardFromPack(client);

  console.log("[demo-suite] 지원자 스크리닝(쇼케이스)…");
  const candidates = await seedCandidateScreeningDemo(client);

  const arcSeedOpts = { skipInstrumentSync: true as const };
  let arc = null;
  if (!options?.skipTechnovaArc) {
    console.log("[demo-suite] ARC 조직진단 풀 리포트 (테크노바)…");
    arc = await seedDemoArcIndex(client, arcSeedOpts);
  } else {
    console.log("[demo-suite] 테크노바 ARC 생략 (운영 통합 시드 — /admin 에서 「운영 ARC 데모」 사용)");
  }

  console.log("[demo-suite] 쇼케이스 기관 ARC 풀 데모 (기관 로그인용)…");
  const showcaseArc = showcase.showcaseOrgId
    ? await seedDemoArcIndex(client, {
        organizationId: showcase.showcaseOrgId,
        waveLabelPrefix: "쇼케이스",
        ...arcSeedOpts,
      })
    : null;

  console.log("[demo-suite] 기관 데모 관리자…");
  const arcAdmin = await seedArcDemoOrgAdmin(client);

  console.log("[demo-suite] 데모 계정 비밀번호…");
  const passwords = await ensureDemoAccountPasswords(client);

  console.log("[demo-suite] 역량평가 데모 과제(역할연기·서류함)…");
  const evidenceAssessment = await seedEvidenceAssessment(client);

  const summary = {
    showcase,
    dashboard,
    candidates,
    arc,
    showcaseArc,
    arcAdmin,
    passwords,
    evidenceAssessment,
    credentialsFile: "src/data/demo/demo-access.json",
    defaultPassword: access.defaultPassword,
  };

  console.log("\n=== AXHRD Demo Suite ===\n");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n시연 스크립트: docs/DEMO_SCRIPT.md");
  console.log("계정 A: dashboard-demo@demo.axhrd.local / Demo2026! → /dashboard");
  console.log("계정 B: arc-demo-admin@demo.axhrd.local / Demo2026! → /org/diagnosis · /org/candidates");
  console.log("슈퍼어드민: /admin/diagnostic → 테크노바 ARC 풀 리포트\n");

  return summary;
}

async function main() {
  await runDemoSuite();
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("demo-suite.ts");

if (invokedDirectly) {
  main()
  .catch((err) => {
    console.error("[demo-suite] 실패:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
}
