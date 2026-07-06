/**
 * 로컬 면접 플로우 스모크 테스트 (dev 서버 + DB + IRT 필요)
 * 실행: cd web && npx tsx scripts/flow-smoke.ts
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.FLOW_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

const RESUME = `
저는 IT 스타트업에서 백엔드 개발자로 2년간 근무했습니다.
사내 결제 API 지연 문제를 분석해 응답 시간을 3.2초에서 0.8초로 75% 개선했습니다.
팀 내 코드 리뷰 문화를 정착시키기 위해 주간 리뷰 세션을 주도했고, 배포 실패율을 12%에서 3%로 낮췄습니다.
`.trim();

const STAR_ANSWER = `
2024년 상반기 사내 결제 API가 트래픽 증가로 평균 3.2초까지 지연되는 상황이었습니다.
제 과제는 병목 구간을 찾아 응답 시간을 1초 이내로 줄이는 것이었습니다.
프로파일링으로 DB 쿼리 N+1을 발견했고, 캐시 레이어를 도입해 배포했습니다.
그 결과 평균 응답이 0.8초로 75% 개선되었고, 고객 문의가 주당 40건에서 8건으로 줄었습니다.
`.trim();

const VAGUE_ANSWER = "열심히 노력해서 잘 해결했습니다.";

type Json = Record<string, unknown>;

async function api(
  path: string,
  opts: { method?: string; body?: unknown; cookie?: string } = {}
): Promise<{ status: number; json: Json; cookie: string }> {
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
  return { status: res.status, json, cookie };
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

async function getSessionQuestion(sessionId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { irtState: true },
  });
  if (!session?.irtState) return null;
  const state = session.irtState as { nextItemId?: string; administeredIds?: string[] };
  const externalId = state.nextItemId;
  if (!externalId) return null;
  const q = await prisma.question.findUnique({ where: { externalId } });
  return q ? { id: q.id, externalId, template: q.template } : null;
}

async function runSession(
  cookie: string,
  planId: string | null,
  sessionIndex: number
): Promise<{
  sessionId: string;
  planId: string;
  firstQuestionText: string;
  firstExternalId: string;
  allExternalIds: string[];
  feedbacks: string[];
}> {
  const start = await api("/api/interview/start", {
    cookie,
    body: {
      industry: "IT_SW",
      jobRole: "DEVELOPER",
      companyName: "테스트랩",
      competency: "COMMUNICATION",
      resumeText: RESUME,
      planId: planId ?? undefined,
    },
  });
  if (start.status !== 200) throw new Error(`start failed: ${JSON.stringify(start.json)}`);

  const sessionId = start.json.sessionId as string;
  const newPlanId = start.json.planId as string;
  let currentCookie = start.cookie;
  const allExternalIds: string[] = [];
  const feedbacks: string[] = [];
  let firstQuestionText = "";
  let firstExternalId = "";

  for (let turn = 0; turn < 3; turn++) {
    const q = await getSessionQuestion(sessionId);
    if (!q) break;
    allExternalIds.push(q.externalId);
    if (turn === 0) {
      firstExternalId = q.externalId;
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { resume: true, targetCompany: true },
      });
      if (session) {
        const { buildPersonalizedQuestion } = await import("../src/lib/interview/build-question");
        const { buildQuestionRationale } = await import("../src/lib/interview/rationale");
        const dbQ = await prisma.question.findUnique({
          where: { id: q.id },
          include: { competency: true },
        });
        if (dbQ) {
          const built = await buildPersonalizedQuestion(
            session,
            dbQ,
            buildQuestionRationale({ level: dbQ.level }),
            { skipPersonalization: false }
          );
          firstQuestionText = built.text;
        }
      }
    }

    const answer = turn === 0 ? STAR_ANSWER : VAGUE_ANSWER;
    const respond = await api("/api/interview/respond", {
      cookie: currentCookie,
      body: {
        sessionId,
        questionId: q.id,
        transcript: answer,
        durationSec: 30,
      },
    });
    currentCookie = respond.cookie;
    if (respond.status !== 200) throw new Error(`respond failed: ${JSON.stringify(respond.json)}`);

    const chip = respond.json.chipEvent as { brief_feedback?: string } | undefined;
    if (chip?.brief_feedback) feedbacks.push(chip.brief_feedback);

    if (respond.json.shouldTerminate) break;
  }

  console.log(`  세션 #${sessionIndex}: ${allExternalIds.join(" → ")}`);
  return {
    sessionId,
    planId: newPlanId,
    firstQuestionText,
    firstExternalId,
    allExternalIds,
    feedbacks,
  };
}

function hasStarMention(text: string): boolean {
  return /상황|과제|행동|결과|STAR|S\s*·\s*T|구체/.test(text);
}

async function main() {
  const stamp = Date.now();
  const email = `flow-smoke-${stamp}@test.local`;

  const reg = await api("/api/auth/register", {
    body: { email, password: "testpass123", name: "플로우테스트" },
  });
  if (reg.status !== 200) throw new Error(`register failed: ${JSON.stringify(reg.json)}`);
  let cookie = reg.cookie;
  console.log(`✓ 가입/로그인: ${email}`);

  const sessions: Awaited<ReturnType<typeof runSession>>[] = [];
  let planId: string | null = null;

  for (let i = 1; i <= 3; i++) {
    const s = await runSession(cookie, planId, i);
    cookie = reg.cookie;
    planId = s.planId;
    sessions.push(s);
  }

  const firstIds = sessions.map((s) => s.firstExternalId);
  const repeats = firstIds.filter((id, idx) => firstIds.indexOf(id) !== idx);
  const crossSessionOverlap = sessions.some((a, i) =>
    sessions.some((b, j) => i !== j && a.allExternalIds[0] === b.allExternalIds[0])
  );

  console.log("\n=== 검증 결과 ===");
  console.log(
    repeats.length === 0 && !crossSessionOverlap
      ? "✓ (a) 연속 세션 첫 문항 즉시 반복 없음"
      : `✗ (a) 반복 감지: ${firstIds.join(", ")}`
  );

  const resumeReflected = sessions[0].firstQuestionText.includes("결제") ||
    sessions[0].firstQuestionText.includes("75%") ||
    sessions[0].firstQuestionText.includes("0.8초") ||
    sessions[0].firstQuestionText.includes("자소서");
  console.log(
    resumeReflected
      ? `✓ (b) 자소서 반영: "${sessions[0].firstQuestionText.slice(0, 80)}…"`
      : `✗ (b) 자소서 미반영: "${sessions[0].firstQuestionText.slice(0, 80)}…"`
  );

  const starOk = sessions[0].feedbacks.some(hasStarMention);
  console.log(
    starOk
      ? `✓ (c) STAR 피드백: "${sessions[0].feedbacks[0]?.slice(0, 100)}…"`
      : `✗ (c) STAR 피드백 없음: ${JSON.stringify(sessions[0].feedbacks)}`
  );

  const q003 = await prisma.question.count({
    where: { externalId: { endsWith: "-003" }, isActive: true },
  });
  console.log(`\nDB -003 문항 수: ${q003} (기대 30)`);

  if (repeats.length || crossSessionOverlap || !resumeReflected || !starOk || q003 < 30) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
