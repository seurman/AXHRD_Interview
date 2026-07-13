import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const htmlPath = path.join(
  root,
  "design_handoff_axhrd_landing",
  "landing.html",
);
const fallbackHtmlPath = path.join(
  root,
  "design_handoff_axhrd_landing",
  "AXHRD 화첩 랜딩.html",
);

const sourcePath = fs.existsSync(htmlPath) ? htmlPath : fallbackHtmlPath;
const html = fs.readFileSync(sourcePath, "utf8");

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error("No <style> block found");
const pageCss = styleMatch[1].trim();

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error("No <body> found");
let body = bodyMatch[1];

// Remove intensity toggle + inline script (handled in React)
body = body.replace(
  /<!-- INTENSITY TOGGLE -->[\s\S]*?<script>[\s\S]*?<\/script>\s*/g,
  "",
);

body = body.replace(/src="assets\//g, 'src="/brand/chapbook/').trim();

body = body
  .replace(/<nav class="top">[\s\S]*?<\/nav>\s*/g, "")
  .replace(/<div class="foot-cols">[\s\S]*?(?=<\/footer>)/g, "")
  .replace(/<div class="foot-col">[\s\S]*?<\/div>\s*/g, "");

// Editorial HR — 카피·인라인 회전 정리
body = body
  .replace(/<span class="chapter-num">첫 페이지<\/span>/g, '<span class="chapter-num">Interview</span>')
  .replace(/<span class="chapter-num">두 번째 페이지<\/span>/g, '<span class="chapter-num">Assessment</span>')
  .replace(/<span class="chapter-num">세 번째 페이지<\/span>/g, '<span class="chapter-num">Diagnostic</span>')
  .replace(/함께<br\/>자라요!/g, "HRD<br/>Science")
  .replace(/— AXHRD가 함께 그립니다\./g, "— AXHRD Research & Product")
  .replace(/transform:\s*rotate\([^;)]+\)\s*;?/gi, "");

const stylesDir = path.join(root, "web/src/styles/chapbook");
fs.writeFileSync(path.join(stylesDir, "landing-page.css"), `${pageCss}\n`);

const outTs = `/* Auto-generated from design_handoff_axhrd_landing/landing.html — do not edit by hand */\nexport const CHAPBOOK_LANDING_HTML = ${JSON.stringify(`<div class="chapbook-root">${body}</div>`)};\n`;
fs.writeFileSync(
  path.join(root, "web/src/components/landing/chapbook/chapbook-markup.ts"),
  outTs,
);

console.log("Wrote landing-page.css and chapbook-markup.ts");
