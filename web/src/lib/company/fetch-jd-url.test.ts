import { describe, expect, it } from "vitest";
import { htmlToPlainText, resolveJdText } from "./fetch-jd-url";

describe("htmlToPlainText", () => {
  it("strips scripts/styles and preserves readable structure", () => {
    const html = `
      <html><head><title>Test JD</title>
      <style>body{color:red}</style>
      <script>alert(1)</script></head>
      <body>
        <main>
          <h1>마케팅 매니저</h1>
          <p>브랜드 전략과 데이터 기반 캠페인을 수행합니다.</p>
          <ul><li>3년 이상 경력</li><li>영어 커뮤니케이션</li></ul>
        </main>
      </body></html>`;
    const text = htmlToPlainText(html);
    expect(text).toContain("마케팅 매니저");
    expect(text).toContain("브랜드 전략");
    expect(text).toContain("3년 이상 경력");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
  });
});

describe("resolveJdText", () => {
  it("prefers pasted text when both url and substantial paste exist", async () => {
    const pasted = "A".repeat(100);
    const result = await resolveJdText({
      jdText: pasted,
      jdUrl: "https://example.com/job",
    });
    // URL fetch may fail in CI; pasted text should still win when long enough
    expect(result.source).toBe("text");
    expect(result.text).toBe(pasted);
  });

  it("returns none when input is empty", async () => {
    const result = await resolveJdText({});
    expect(result.source).toBe("none");
    expect(result.text).toBe("");
  });
});

describe("fetchJdTextFromUrl (live)", () => {
  it(
    "fetches a public job posting within performance budget",
    async () => {
      const { fetchJdTextFromUrl } = await import("./fetch-jd-url");
      const url =
        "https://careers.google.com/jobs/results/86470736511673030-software-engineer/";
      const result = await fetchJdTextFromUrl(url);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.text.length).toBeGreaterThan(200);
      expect(result.text.toLowerCase()).toMatch(/software engineer|google/);
      expect(result.ms).toBeLessThan(12_000);
      console.log(`[perf] JD fetch ${result.ms}ms, ${result.bytes} bytes, ${result.text.length} chars`);
    },
    20_000,
  );

  it("blocks localhost SSRF", async () => {
    const { fetchJdTextFromUrl } = await import("./fetch-jd-url");
    const result = await fetchJdTextFromUrl("http://127.0.0.1/admin");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/내부|차단|올바른/);
  });
});
