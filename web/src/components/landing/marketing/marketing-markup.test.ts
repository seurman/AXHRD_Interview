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
});
