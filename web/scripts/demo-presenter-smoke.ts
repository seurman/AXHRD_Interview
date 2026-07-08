/**
 * 데모 시연 시작 스모크 — 로컬 DB에 최소 키트 생성 후 presenter start API 호출
 */
import { prisma } from "../src/lib/prisma";
import { generatePresenterKey } from "../src/lib/demo/presenter";

async function main() {
  const slug = `smoke-${Date.now().toString(36)}`;
  const presenterKey = generatePresenterKey();

  const ws = await prisma.demoWorkspace.create({
    data: { name: "스모크 데모", slug, presenterKey },
  });
  const comp = await prisma.demoCompetency.create({
    data: {
      workspaceId: ws.id,
      code: "SMOKE_DEMO",
      nameKo: "스모크 역량",
      sortOrder: 1,
      isActive: true,
    },
  });
  await prisma.demoQuestion.createMany({
    data: [
      {
        workspaceId: ws.id,
        competencyId: comp.id,
        externalId: "DEMO-SMOKE-L3",
        level: 3,
        template: "스모크 테스트 질문입니다. 구체적으로 답해 주세요.",
        sortOrder: 1,
        isActive: true,
      },
      {
        workspaceId: ws.id,
        competencyId: comp.id,
        externalId: "DEMO-SMOKE-L4",
        level: 4,
        template: "두 번째 스모크 질문입니다.",
        sortOrder: 2,
        isActive: true,
      },
    ],
  });

  const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
  const started = Date.now();
  const res = await fetch(`${base}/api/demo/${encodeURIComponent(slug)}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      focusCompetency: "SMOKE_DEMO",
      jobRole: "OTHER",
      presenterMode: true,
      presenterKey,
    }),
  });
  const elapsed = Date.now() - started;
  const data = await res.json().catch(() => ({}));
  console.log("status", res.status, "elapsedMs", elapsed);
  console.log(JSON.stringify(data, null, 2));

  if (!res.ok || !data.sessionId) {
    throw new Error("demo start failed");
  }

  const cookie = res.headers.get("set-cookie");
  console.log("presenter cookie set:", !!cookie?.includes("hr_in_demo_presenter"));

  const pageRes = await fetch(`${base}/interview/${data.sessionId}`, {
    headers: cookie ? { cookie: cookie.split(";")[0] } : {},
    redirect: "manual",
  });
  console.log("interview page status", pageRes.status);

  await prisma.interviewSession.delete({ where: { id: data.sessionId } }).catch(() => {});
  await prisma.demoWorkspace.delete({ where: { id: ws.id } }).catch(() => {});
  console.log("OK smoke passed in", elapsed, "ms");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
