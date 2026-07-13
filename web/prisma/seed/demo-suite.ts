/**
 * 고객 시연용 통합 데모 시드 — JSON 팩 업로드형 데이터 → DB
 *
 * Usage: cd web && npm run db:seed:demo
 *
 * 포함:
 * - 개인 대시보드 (6축·차수 요약·자기발견) — dashboard-demo@demo.axhrd.local
 * - 조직진단 ARC 리포트 (2웨이브·하이어라키) — 테크노바 (ARC 데모)
 * - 기관 콘솔 로그인 — arc-demo-admin@demo.axhrd.local
 * - 쇼케이스 코호트·경량 진단 웨이브
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
import access from "../../src/data/demo/demo-access.json";

const prisma = new PrismaClient();

async function main() {
  console.log("[demo-suite] ARC Index · NCS 동기화…");
  await seedArcIndex(prisma);
  await syncNcsCompetencyBank(prisma);

  console.log("[demo-suite] 쇼케이스 코호트·경량 진단…");
  const showcase = await seedShowcaseDemoData(prisma);

  console.log("[demo-suite] 개인 대시보드 팩 적용…");
  const dashboard = await seedPersonalDashboardFromPack(prisma);

  console.log("[demo-suite] 지원자 스크리닝(쇼케이스)…");
  const candidates = await seedCandidateScreeningDemo(prisma);

  console.log("[demo-suite] ARC 조직진단 풀 리포트…");
  const arc = await seedDemoArcIndex(prisma);

  console.log("[demo-suite] 테크노바 기관 관리자…");
  const arcAdmin = await seedArcDemoOrgAdmin(prisma);

  console.log("[demo-suite] 데모 계정 비밀번호…");
  const passwords = await ensureDemoAccountPasswords(prisma);

  const summary = {
    showcase,
    dashboard,
    candidates,
    arc,
    arcAdmin,
    passwords,
    credentialsFile: "src/data/demo/demo-access.json",
    defaultPassword: access.defaultPassword,
  };

  console.log("\n=== AXHRD Demo Suite ===\n");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n로그인: dashboard-demo@demo.axhrd.local / Demo2026! → /dashboard");
  console.log("기관: arc-demo-admin@demo.axhrd.local / Demo2026! → /org/diagnosis");
  console.log("지원자 결과: showcase-axhrd-showcase-m0@demo.axhrd.local → /org/candidates");
  console.log("슈퍼어드민: /admin/diagnostic → 테크노바 (ARC 데모) 리포트\n");
}

main()
  .catch((err) => {
    console.error("[demo-suite] 실패:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
