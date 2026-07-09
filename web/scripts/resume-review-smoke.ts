/**
 * Smoke test: resume review API + key pages (local dev server).
 * Usage: npx tsx scripts/resume-review-smoke.ts
 */
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const SAMPLE_RESUME = `
저는 IT 스타트업에서 3년간 프론트엔드 개발자로 근무했습니다.
React와 TypeScript로 B2B SaaS 대시보드를 개발했고, 월간 활성 사용자 40% 증가에 기여했습니다.
비개발 직군과 협업할 때 API 스펙을 문서화하고 주간 데모로 의사소통 격차를 줄였습니다.
문제가 발생하면 사용자 로그를 분석해 원인을 찾고, 2주 내 핫픽스를 배포한 경험이 있습니다.
`.trim();

type CookieJar = Map<string, string>;

function parseSetCookie(headers: Headers): void {
  const raw = headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const part = line.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

const jar: CookieJar = new Map();

function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchJson(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; json: Record<string, unknown>; headers: Headers }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(jar.size ? { Cookie: cookieHeader() } : {}),
    },
  });
  parseSetCookie(res.headers);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json, headers: res.headers };
}

async function main() {
  const stamp = Date.now();
  const email = `smoke-review-${stamp}@hr-in.local`;
  const password = "testpass12";

  console.log("1) Register + login");
  let r = await fetchJson("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "SmokeReview" }),
  });
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`register failed: ${r.status} ${JSON.stringify(r.json)}`);
  }

  r = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (r.status !== 200) {
    throw new Error(`login failed: ${r.status} ${JSON.stringify(r.json)}`);
  }
  console.log("   OK session cookie set");

  console.log("2) POST /api/resume/review");
  r = await fetchJson("/api/resume/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeText: SAMPLE_RESUME,
      industry: "IT_SW",
      jobRole: "DEVELOPMENT",
    }),
  });
  if (r.status !== 200) {
    throw new Error(`review create failed: ${r.status} ${JSON.stringify(r.json)}`);
  }
  const reviewId = r.json.id;
  if (typeof reviewId !== "string") {
    throw new Error(`missing review id: ${JSON.stringify(r.json)}`);
  }
  console.log(`   OK reviewId=${reviewId}`);

  console.log("3) GET /api/resume/review/[id]");
  r = await fetchJson(`/api/resume/review/${reviewId}`);
  if (r.status !== 200) {
    throw new Error(`review get failed: ${r.status} ${JSON.stringify(r.json)}`);
  }
  if (typeof r.json.overallSummary !== "string" || !r.json.overallSummary) {
    throw new Error("overallSummary missing");
  }
  console.log("   OK overallSummary length", (r.json.overallSummary as string).length);

  console.log("4) Pages (auth required)");
  for (const path of ["/resume-review", `/resume-review/${reviewId}`, "/interview/setup"]) {
    const page = await fetch(`${BASE}${path}`, {
      headers: { Cookie: cookieHeader() },
      redirect: "manual",
    });
    if (page.status !== 200) {
      throw new Error(`page ${path} => ${page.status}`);
    }
    console.log(`   OK ${path} => 200`);
  }

  console.log("5) TTS cache key unit sanity");
  const { ttsCacheKey } = await import("../src/lib/interview/tts-cache-key");
  const a = ttsCacheKey("q1", "첫 질문", false);
  const b = ttsCacheKey("q1", "꼬리질문", true);
  if (a === b) throw new Error("TTS cache keys must differ for follow-up");
  console.log("   OK follow-up cache keys differ");

  console.log("\nAll smoke checks passed.");
}

main().catch((e) => {
  console.error("\nSMOKE FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
