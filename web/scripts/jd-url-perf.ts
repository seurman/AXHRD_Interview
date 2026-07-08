/**
 * JD URL 페치·JD 매핑 성능 벤치 (DB 불필요)
 * 실행: cd web && npx tsx scripts/jd-url-perf.ts
 */
import { performance } from "node:perf_hooks";
import { fetchJdTextFromUrl, resolveJdText } from "../src/lib/company/fetch-jd-url";
import { deriveInterviewStyleFromJD } from "../src/lib/company/jd-mapper";

const JD_URL =
  "https://careers.google.com/jobs/results/86470736511673030-software-engineer/";

async function bench(label: string, fn: () => Promise<void>) {
  const t0 = performance.now();
  await fn();
  const ms = Math.round(performance.now() - t0);
  console.log(`${label}: ${ms}ms`);
  return ms;
}

async function main() {
  console.log("=== JD URL 성능 벤치 (DB 없음) ===\n");

  let jdText = "";
  const fetchMs = await bench("1) fetchJdTextFromUrl (Google Careers)", async () => {
    const r = await fetchJdTextFromUrl(JD_URL);
    if (!r.ok) throw new Error(r.error);
    jdText = r.text;
    console.log(`   → ${r.text.length} chars, ${r.bytes} bytes, server reported ${r.ms}ms`);
  });

  await bench("2) resolveJdText (URL only)", async () => {
    const r = await resolveJdText({ jdUrl: JD_URL });
    if (r.source !== "url" || r.text.length < 200) throw new Error("resolve failed");
  });

  const mapMs = await bench("3) deriveInterviewStyleFromJD", async () => {
    const r = await deriveInterviewStyleFromJD({
      jdText,
      industryLabel: "IT/소프트웨어",
    });
    console.log(
      `   → ${r ? `tone=${r.interviewStyle.tone}, size=${r.companySize ?? "—"}` : "null (키워드/Gemini 없음)"}`,
    );
  });

  console.log("\n=== 판정 ===");
  const ok = fetchMs < 8000;
  console.log(ok ? "✓ fetch < 8s" : "✗ fetch 느림");
  console.log(mapMs < 10000 ? "✓ JD 매핑 < 10s" : "△ JD 매핑 느림 (Gemini 호출 시 정상)");
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
