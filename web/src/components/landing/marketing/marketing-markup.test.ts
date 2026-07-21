import { describe, expect, it } from "vitest";
import { buildMarketingHomeHtml } from "./marketing-markup";

describe("buildMarketingHomeHtml", () => {
  it("injects start and demo hrefs instead of #", () => {
    const html = buildMarketingHomeHtml(
      "/auth/register?next=/interview/setup",
      "/demo#trial",
    );
    expect(html).toContain('href="/auth/register?next=/interview/setup"');
    expect(html).toContain('href="/demo#trial"');
    expect(html).not.toContain('href="#" class="btn btn-primary btn-lg" data-cta="start"');
    expect(html).not.toContain("__START_HREF__");
    expect(html).not.toContain("__DEMO_HREF__");
  });

  it("updates when logged-in start href changes", () => {
    const html = buildMarketingHomeHtml("/dashboard", "/demo#trial");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('data-cta="start"');
  });

  it("keeps a brand-first stage hero without pill/θ jargon", () => {
    const html = buildMarketingHomeHtml();
    const hero = html.slice(
      html.indexOf('class="hero hero--stage"'),
      html.indexOf('id="products"'),
    );
    expect(hero).toContain('class="hero-brand"');
    expect(hero).toContain(">AXHRD<");
    expect(hero).not.toContain("θ");
    expect(hero).not.toContain('class="pill"');
    expect(hero).not.toContain("hero-preview");
  });

  it("shows a concrete 자소서-grounded sample question in the stage", () => {
    const html = buildMarketingHomeHtml();
    expect(html).toContain("hero-stage-q");
    expect(html).toContain("역할 재분배와 일일 체크인");
    expect(html).not.toContain(
      "자소서에서 말씀하신 협업 갈등 상황, 그때 본인이 먼저 제안한 해결책은 무엇이었나요?",
    );
  });

  it("aligns below-hero copy to Korean three-step flow", () => {
    const html = buildMarketingHomeHtml();
    expect(html).toContain("흐름 · 3단계");
    expect(html).toContain("process-grid--three");
    expect(html).toContain("01 · 면접");
    expect(html).not.toContain("θ");
    expect(html).not.toContain("JD");
    expect(html).not.toContain("Discover");
    expect(html).not.toContain("Growth loop");
    expect(html).not.toContain("NCS");
  });

  it("surfaces competency learning path on the home wedge", () => {
    const html = buildMarketingHomeHtml();
    expect(html).toContain("역량 학습 패스");
    expect(html).toContain('href="/practice/path"');
    expect(html).toContain("학습 패스 · 기록");
    expect(html).toContain("역량 패스로 쌓아");
  });
});
