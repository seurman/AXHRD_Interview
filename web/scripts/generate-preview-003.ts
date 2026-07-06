/**
 * -003 문항 30개 정적 미리보기 HTML 생성
 * 실행: npx tsx scripts/generate-preview-003.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..", "..");
const seed = JSON.parse(readFileSync(join(root, "seed", "questions.json"), "utf-8")) as {
  questions: Array<{
    externalId: string;
    competency: string;
    level: number;
    template: string;
  }>;
};

const COMP_LABELS: Record<string, string> = {
  COMMUNICATION: "소통능력",
  PROBLEM_SOLVING: "문제해결",
  JOB_FIT: "직무적합",
  ORG_FIT: "조직적합",
  LEADERSHIP: "리더십",
  GROWTH: "성장가능성",
};

const items = seed.questions.filter((q) => q.externalId.endsWith("-003"));
const cards = items
  .map((q) => {
    const ref = seed.questions.find(
      (x) => x.competency === q.competency && x.level === q.level && x.externalId.endsWith("-001")
    );
    return `<article class="card">
  <div class="meta">
    <span class="badge">${q.externalId}</span>
    <span class="badge">${COMP_LABELS[q.competency] ?? q.competency}</span>
    <span class="badge level">L${q.level}</span>
  </div>
  <div class="template">${q.template}</div>
  ${ref ? `<div class="ref">같은 레벨 기존(-001): ${ref.template}</div>` : ""}
</article>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>-003 문항 미리보기 (${items.length}개)</title>
  <style>
    :root { --primary: #2f5fee; --muted: #47536e; --border: #e2e8f0; }
    body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    header { background: white; border-bottom: 1px solid var(--border); padding: 1.25rem 1.5rem; position: sticky; top: 0; }
    h1 { margin: 0 0 .25rem; font-size: 1.25rem; }
    p { margin: 0; color: var(--muted); font-size: .9rem; }
    main { max-width: 960px; margin: 0 auto; padding: 1.5rem; display: grid; gap: 1rem; }
    .card { background: white; border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem 1.5rem; }
    .meta { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .75rem; }
    .badge { font-size: .75rem; padding: .2rem .55rem; border-radius: 999px; background: #eef2ff; color: var(--primary); font-weight: 600; }
    .level { background: #f1f5f9; color: var(--muted); }
    .template { font-size: 1.05rem; line-height: 1.6; }
    .ref { margin-top: .75rem; font-size: .8rem; color: var(--muted); border-top: 1px dashed var(--border); padding-top: .75rem; }
  </style>
</head>
<body>
  <header>
    <h1>신규 -003 문항 ${items.length}개</h1>
    <p>기존 -001 문항과 나란히 비교 · 면접 화면 톤 점검용</p>
  </header>
  <main>${cards}</main>
</body>
</html>`;

const out = join(import.meta.dirname, "preview-003-questions.html");
writeFileSync(out, html, "utf-8");
console.log(`Wrote ${items.length} questions → ${out}`);
