/**
 * 채용공고 URL + 자기소개서 E2E·성능 스모크
 * 실행: cd web && npx tsx scripts/jd-url-smoke.ts
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.FLOW_BASE_URL ?? "http://localhost:3000";
const JD_URL =
  "https://careers.google.com/jobs/results/86470736511673030-software-engineer/";

const COVER_LETTER = `
지원동기
저는 대규모 분산 시스템과 백엔드 인프라에 관심이 많아 Google의 Software Engineer, Infrastructure 포지션에 지원합니다.
대학 시절 오픈소스 기여와 사이드 프로젝트를 통해 Go·Java 기반 서비스를 설계·운영한 경험이 있습니다.

경험
- 사내 모니터링 플랫폼을 구축해 장애 탐지 시간을 평균 18분에서 4분으로 단축했습니다.
- Kubernetes 기반 배포 파이프라인을 정비해 릴리스 실패율을 9%에서 2%로 낮췄습니다.
- 팀 내 코드 리뷰 가이드를 작성해 온보딩 기간을 3주에서 1.5주로 줄였습니다.

성장 포부
Google의 글로벌 인프라 환경에서 신뢰성·확장성 문제를 풀며 더 많은 사용자에게 안정적인 서비스를 제공하고 싶습니다.
`.trim();

const prisma = new PrismaClient();

type Json = Record<string, unknown>;

async function api(
  path: string,
  opts: { method?: string; body?: unknown; cookie?: string } = {},
): Promise<{ status: number; json: Json; cookie: string; ms: number }> {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = mergeCookies(opts.cookie ?? "", setCookie);
  const json = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, json, cookie, ms: Date.now() - started };
}

function mergeCookies(existing: string, setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const part of existing.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k && v) jar.set(k, v);
  }
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const [k, v] = pair.split("=");
    if (k && v) jar.set(k.trim(), v.trim());
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function main() {
  const stamp = Date.now();
  const email = `jd-url-smoke-${stamp}@test.local`;
  console.log("=== JD URL 기능·성능 스모크 ===\n");

  const reg = await api("/api/auth/register", {
    body: { email, password: "testpass123", name: "JD URL 테스트" },
  });
  if (reg.status !== 200) throw new Error(`register failed: ${JSON.stringify(reg.json)}`);
  let cookie = reg.cookie;
  console.log(`✓ 가입 (${reg.ms}ms): ${email}`);

  const fetchJd = await api("/api/jd/fetch", {
    cookie,
    body: { url: JD_URL },
  });
  if (fetchJd.status !== 200) throw new Error(`jd/fetch failed: ${JSON.stringify(fetchJd.json)}`);
  const jdText = fetchJd.json.text as string;
  console.log(
    `✓ JD fetch (${fetchJd.ms}ms): ${jdText.length} chars, title=${fetchJd.json.title ?? "—"}`,
  );
  if (jdText.length < 200) throw new Error("JD text too short");
  if (!/software engineer|google/i.test(jdText)) throw new Error("JD content mismatch");

  const start = await api("/api/interview/start", {
    cookie,
    body: {
      industry: "IT_SW",
      companySize: "LARGE",
      jobRole: "DEVELOPER",
      companyName: "Google",
      focusCompetency: "COMMUNICATION",
      resumeText: COVER_LETTER,
      jdUrl: JD_URL,
    },
  });
  cookie = start.cookie;
  if (start.status !== 200) throw new Error(`start failed: ${JSON.stringify(start.json)}`);
  const sessionId = start.json.sessionId as string;
  console.log(`✓ 면접 시작 (${start.ms}ms): session=${sessionId}`);

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { targetCompany: true, resume: true },
  });
  if (!session) throw new Error("session not found");

  const archive = await prisma.userTextRecord.findFirst({
    where: { userId: session.userId, kind: "INTERVIEW_SETUP" },
    orderBy: { createdAt: "desc" },
  });
  const setupText = archive?.content ?? "";
  const hasJdInArchive = /JD:\s*있음/.test(setupText);
  const hasResumeInArchive = /자소서:\s*있음/.test(setupText);

  const style = session.targetCompany?.interviewStyle as
    | { tone?: string; focus?: string[] }
    | null
    | undefined;
  const hasInterviewStyle = !!style && (!!style.tone || (style.focus?.length ?? 0) > 0);

  const q = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { irtState: true },
  });
  const nextItemId = (q?.irtState as { nextItemId?: string } | null)?.nextItemId;
  let firstQuestion = "";
  if (nextItemId) {
    const dbQ = await prisma.question.findUnique({ where: { externalId: nextItemId } });
    if (dbQ) {
      const { buildPersonalizedQuestion } = await import("../src/lib/interview/build-question");
      const { buildQuestionRationale } = await import("../src/lib/interview/rationale");
      firstQuestion = (
        await buildPersonalizedQuestion(
          session,
          { ...dbQ, competency: await prisma.competency.findFirstOrThrow({ where: { code: "COMMUNICATION", ownerScope: "PLATFORM", organizationId: null } }) },
          buildQuestionRationale({ level: dbQ.level }),
          { skipPersonalization: false },
        )
      ).text;
    }
  }

  const resumeReflected =
    firstQuestion.includes("모니터링") ||
    firstQuestion.includes("Kubernetes") ||
    firstQuestion.includes("18분") ||
    firstQuestion.includes("자소서") ||
    firstQuestion.includes("인프라");

  console.log("\n=== 품질 검증 ===");
  console.log(hasJdInArchive ? "✓ JD가 setup 아카이브에 반영됨" : "✗ JD 아카이브 미반영");
  console.log(hasResumeInArchive ? "✓ 자소서가 setup 아카이브에 반영됨" : "✗ 자소서 아카이브 미반영");
  console.log(
    hasInterviewStyle
      ? `✓ JD 기반 interviewStyle: tone=${style?.tone ?? "—"}, focus=${style?.focus?.join(", ") ?? "—"}`
      : "△ interviewStyle 없음 (GEMINI_API_KEY 미설정 시 키워드 단서만 반영될 수 있음)",
  );
  console.log(
    resumeReflected
      ? `✓ 첫 질문 자소서 반영: "${firstQuestion.slice(0, 100)}…"`
      : `△ 첫 질문 자소서 직접 인용 없음: "${firstQuestion.slice(0, 100)}…"`,
  );

  console.log("\n=== 성능 요약 ===");
  console.log(`JD fetch API: ${fetchJd.ms}ms (목표 < 8000ms)`);
  console.log(`면접 start (JD URL 서버 fetch 포함): ${start.ms}ms (목표 < 25000ms)`);

  const perfOk = fetchJd.ms < 8000 && start.ms < 25000;
  const qualityOk = hasJdInArchive && hasResumeInArchive && jdText.length >= 200;
  if (!perfOk || !qualityOk) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
