/**
 * Marketing home → hybrid layout (shorter, wedge-focused).
 * Run: node web/scripts/apply-hybrid-home-markup.mjs
 */
import fs from "node:fs";
import path from "node:path";

const markupPath = path.join(
  import.meta.dirname,
  "../src/components/landing/marketing/marketing-markup.ts",
);

const src = fs.readFileSync(markupPath, "utf8");
const prefix = 'export const MARKETING_HOME_HTML = "';
const start = src.indexOf(prefix);
if (start < 0) throw new Error("MARKETING_HOME_HTML not found");
const contentStart = start + prefix.length;
const contentEnd = src.lastIndexOf('";');
if (contentEnd < 0) throw new Error("closing quote not found");

let html = src
  .slice(contentStart, contentEnd)
  .replace(/\\n/g, "\n")
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, "\\");

html = html.replace(
  /<div class="hero-grid">[\s\S]*?<\/div>\s*\n\n      <!-- Product Preview -->/,
  `<div class="hero-lede">
        <h1>
            연습할수록 답이 단단해지고,<br/>
            역량 점수가 쌓입니다<span class="dot">.</span>
          </h1>
        <div class="hero-body">
          <p class="sub">
            공고와 자소서에서 질문을 만들고, <strong>실전처럼 말로 연습합니다.</strong><br/>
            같은 기준으로 채점하고, 자소서 기반 질문으로 현장감을 살립니다. 표정·감정 AI는 쓰지 않습니다.
          </p>
          <div class="hero-action-col">
            <div class="hero-ctas">
              <a href="#" class="btn btn-primary btn-lg" data-cta="start">무료로 시작하기 →</a>
              <a href="#" class="btn btn-ghost btn-lg" data-cta="demo">면접 1문항 맛보기 →</a>
            </div>
            <p class="hero-micro">카드 없이 시작 · <a href="/pricing" class="price-link">1문항 맛보기 가능</a></p>
            <div class="hero-secondary-link"><a href="#process" class="arrow-link">성장 여정 보기 <span class="arr">→</span></a></div>
          </div>
        </div>
      </div>

      <!-- Product Preview -->`,
);

html = html.replace(
  `<div class="pill"><span class="live-dot"></span>월 3회 무료 면접</div>
        <div class="caption">역량 성장 플랫폼</div>`,
  `<div class="pill"><span class="live-dot"></span>월 3회 무료 · 음성 AI 면접</div>
        <div class="caption">자소서와 면접을 잇는 역량 플랫폼</div>`,
);
html = html.replace(
  `<h1>
            쌓이는 역량,<br/>
            보이는 준비<span class="dot">.</span>
          </h1>`,
  `<h1>
            연습할수록 답이 단단해지고,<br/>
            역량 점수가 쌓입니다<span class="dot">.</span>
          </h1>`,
);
html = html.replace(
  `<p class="sub">
            면접만, 자소서만 따로 준비할 필요 없습니다.<br/>
            <strong>한 계정</strong>에서 연습하고, <strong>같은 기준</strong>으로 평가받고, 성장은 <strong>숫자로 남습니다.</strong><br/>
            질문은 자소서에서 나옵니다. 꾸민 말이 아니라, 내 이야기로 답하게 됩니다.
          </p>`,
  `<p class="sub">
            공고와 자소서에서 질문을 만들고, <strong>실전처럼 말로 연습합니다.</strong><br/>
            같은 기준으로 채점하고, 자소서 기반 질문으로 현장감을 살립니다. 표정·감정 AI는 쓰지 않습니다.
          </p>`,
);
html = html.replace(
  `<p class="hero-micro">카드 등록 없이 시작 · <a href="/pricing" class="price-link">월 3회 면접 무료</a></p>`,
  `<p class="hero-micro">카드 없이 시작 · <a href="/pricing" class="price-link">1문항 맛보기 가능</a></p>`,
);
html = html.replace(
  `<div class="proof-label">믿고 쓰는<br/>3가지 약속</div>
        <div class="proof-pills">
          <span>채점 기준은 공개합니다</span>
          <span>질문은 자소서에서 나옵니다</span>
          <span>표정·감정 AI는 쓰지 않습니다</span>
          <span>개인과 기관, 같은 데이터</span>
        </div>`,
  `<div class="proof-label">검증 가능한<br/>면접 준비</div>
        <div class="proof-pills">
          <span>왜 이 점수인지, 근거와 함께</span>
          <span>질문은 자소서에서 나옵니다</span>
          <span>답변 내용만 봅니다</span>
          <span>연습 기록은 숫자로 남습니다</span>
        </div>`,
);
html = html.replace(
  `<div class="sec-eyebrow">Growth loop · 4단계</div>
        <h2 class="sec-title">탐색부터 면접까지,<br/>하나의 줄기로 이어집니다.</h2>`,
  `<div class="sec-eyebrow">Growth loop · 4단계</div>
        <h2 class="sec-title">탐색부터 면접까지,<br/>끊기지 않습니다.</h2>`,
);
html = html.replace(
  `<div class="sec-sub">
        찾은 강점이 자소서와 면접 질문으로 이어지고,<br/>답할 때마다 역량 점수와 기관 지표가 쌓입니다.
      </div>`,
  `<div class="sec-sub">
        자소서에서 질문이 나오고, 음성으로 답하면 역량 점수가 쌓입니다.<br/>개인 연습과 기관 운영이 같은 기준으로 이어집니다.
      </div>`,
);
html = html.replace(
  `<h4>AI 면접</h4>
        <p>자소서에서 나온 질문에 말로 답하고, 꼬리질문으로 깊이를 봅니다.</p>`,
  `<h4>AI 면접</h4>
        <p>자소서 기반의 질문으로 현장감을 살립니다. 음성으로 답하고, 꼬리질문으로 깊이를 봅니다.</p>`,
);
html = html.replace(
  `<span>·</span><span>자소서 근거 인용</span>`,
  `<span>·</span><span>자소서 기반 질문</span>`,
);
html = html.replace(
  `<h2>지금,<br/>시작하세요<span class="dot">.</span></h2>`,
  `<h2>지금, 한 문항부터<br/>시작하세요<span class="dot">.</span></h2>`,
);

html = html.replace(
  /\s*<!-- ═══════════════ PROBLEM[\s\S]*?<!-- ═══════════════ PROCESS/,
  "\n\n  <!-- ═══════════════ PROCESS",
);

html = html.replace(
  /\s*<!-- ═══════════════ QUOTE[\s\S]*?<!-- ═══════════════ CTA/,
  "\n\n  <!-- ═══════════════ CTA",
);

const wedgeProducts = `
  <!-- ═══════════════ PRODUCTS ═══════════════ -->
  <section class="products products--hybrid" id="products">
    <div class="sec-head">
      <div>
        <div class="sec-eyebrow">Start here · 지금 여기서</div>
        <h2 class="sec-title">면접 준비,<br/>세 단계면 충분합니다.</h2>
      </div>
      <div class="sec-sub">
        자소서 기반 질문으로 현장감 있게 연습하고, 말로 답하면 점수가 쌓입니다.<br/>
        나머지 모듈은 가입 후 <a href="/products" class="inline-link">전체 기능</a>에서 이어집니다.
      </div>
    </div>

    <div class="prod-grid prod-grid--wedge">
      <a class="prod-card prod-card--hero" href="/auth/register?next=/interview/setup">
        <div class="prod-head">
          <span class="prod-mono">01 · Interview</span>
          <span class="prod-arr">↗</span>
        </div>
        <div class="prod-name">AI 면접</div>
        <p class="prod-desc">자소서 기반의 질문으로 현장감을 살립니다. 음성으로 답하고, 꼬리질문·역량 점수까지 한 번에.</p>
        <div class="prod-tags">
          <span class="tag">음성 · 꼬리질문</span>
          <span class="tag coral">월 3회 무료</span>
        </div>
      </a>

      <a class="prod-card" href="/resume-review">
        <div class="prod-head">
          <span class="prod-mono">02 · Resume</span>
          <span class="prod-arr">↗</span>
        </div>
        <div class="prod-name">자소서 리뷰</div>
        <p class="prod-desc">공고에 맞게 문장을 다듬고, 면접 질문의 뼈대를 만듭니다.</p>
        <div class="prod-tags">
          <span class="tag coral">JD 맞춤</span>
          <span class="tag">면접 연동</span>
        </div>
      </a>

      <a class="prod-card" href="/dashboard">
        <div class="prod-head">
          <span class="prod-mono">03 · Growth</span>
          <span class="prod-arr">↗</span>
        </div>
        <div class="prod-name">역량 트래킹</div>
        <p class="prod-desc">연습할수록 점수가 쌓입니다. 합격 전에 실력이 보입니다.</p>
        <div class="prod-tags">
          <span class="tag">역량 점수 · θ</span>
          <span class="tag">NCS 인증서</span>
        </div>
      </a>
    </div>

    <p class="products-more">
      <a href="/products" class="arrow-link">Discover · Practice · 조직 진단 등 전체 기능 보기 <span class="arr">→</span></a>
    </p>
  </section>`;

html = html.replace(
  /\s*<!-- ═══════════════ PRODUCTS[\s\S]*?<section class="pricing-strip"/,
  `${wedgeProducts}\n\n  <section class="pricing-strip"`,
);

const whyDuo = `
  <!-- ═══════════════ WHY ═══════════════ -->
  <section class="why why--hybrid" id="why">
    <div class="why-inner">
      <div class="sec-head">
        <div>
          <div class="sec-eyebrow">Why AXHRD</div>
          <h2 class="sec-title">공정하게 채점하고,<br/>성장은 남깁니다.</h2>
        </div>
        <div class="sec-sub">
          이력서가 아니라 답변으로 평가합니다. 감정 AI 없이, 문서화된 루브릭으로 채점합니다.<br/>
          <a href="#" data-cta="demo" class="inline-link">1문항 맛보기</a>로 기준을 먼저 확인해 보세요.
        </div>
      </div>

      <div class="why-grid why-grid--duo">
        <div class="principle hero-p">
          <div class="icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l3 12 6-3 6 3 3-12"/></svg>
          </div>
          <h4>투명한 채점</h4>
          <p>이력서가 아니라, 답변으로 평가합니다. 왜 이 점수인지 근거와 함께 확인합니다.</p>
          <div class="foot">Same rubric · Repeatable</div>
        </div>
        <div class="principle">
          <div class="icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h4>성장이 남습니다</h4>
          <p>연습할수록 점수가 쌓입니다. 합격 전에 실력이 보이고, 기록은 숫자로 남습니다.</p>
          <div class="foot">역량 점수 · Growth loop</div>
        </div>
      </div>
    </div>
  </section>`;

html = html.replace(
  /\s*<!-- ═══════════════ WHY[\s\S]*?<!-- ═══════════════ AUDIENCES/,
  `${whyDuo}\n\n  <!-- ═══════════════ AUDIENCES`,
);

const audSingle = `
  <!-- ═══════════════ AUDIENCES ═══════════════ -->
  <section class="audiences aud-single" id="audiences">
    <div class="sec-head">
      <div>
        <div class="sec-eyebrow">For you · 지금 시작</div>
        <h2 class="sec-title">혼자 연습해도<br/>기록은 남습니다.</h2>
      </div>
      <div class="sec-sub">
        월 3회 무료 면접 · 자소서 리뷰 · 질문 연습. 한 계정에서 끊기지 않고 이어집니다.
      </div>
    </div>

    <div class="aud-panel aud-panel--solo active">
      <div class="aud-left">
        <ul class="aud-checks">
          <li>계정 없이 <strong>1문항 맛보기</strong> 가능</li>
          <li>가입 후 월 3회 면접 무료 · 카드 등록 없음</li>
          <li>답변은 나만 보고, 채점 근거는 함께 확인</li>
        </ul>
        <div class="aud-cta-row">
          <a href="#" class="btn btn-accent" data-cta="demo">면접 1문항 맛보기 →</a>
          <a href="#" class="btn btn-ghost" data-cta="start">무료로 시작 →</a>
        </div>
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">나의 성장 · Last 30 days</div><div class="lbl">Personal</div></div>
        <div class="mock-stat-row">
          <div class="mstat"><div class="n">14<span class="u">회</span></div><div class="l">Sessions</div></div>
          <div class="mstat"><div class="n">+6<span class="u">점</span></div><div class="l">역량 성장</div></div>
          <div class="mstat"><div class="n">82<span class="u">/100</span></div><div class="l">JD match</div></div>
        </div>
        <div class="mock-chart">
          <div class="bar" style="height: 40%"></div>
          <div class="bar" style="height: 55%"></div>
          <div class="bar" style="height: 65%"></div>
          <div class="bar" style="height: 58%"></div>
          <div class="bar coral" style="height: 88%"></div>
        </div>
      </div>
    </div>

    <div class="org-strip">
      <div class="org-strip-copy">
        <p class="org-strip-title">대학·기업·조직 도입</p>
        <p class="org-strip-desc">취업센터, HR, 코호트 운영은 링크 배포와 집계 리포트로 이어집니다.</p>
      </div>
      <a href="/org/setup" class="btn btn-ghost" data-cta="org">도입 문의 →</a>
    </div>
  </section>`;

html = html.replace(
  /\s*<!-- ═══════════════ AUDIENCES[\s\S]*?<!-- ═══════════════ CTA/,
  `${audSingle}\n\n  <!-- ═══════════════ CTA`,
);

html = html.replace(
  `<p class="p">
          개인은 지금 바로, 기관은 상담 한 번으로.<br/>
          카드 없이 시작하고, 월 3회 면접은 무료입니다.<br/>
          대규모 운영·킷 설계는 도입 문의를 이용해 주세요.
        </p>`,
  `<p class="p">
          <strong>면접 질문이 자소서에서 나오면, 답변도 달라집니다.</strong><br/>
          카드 없이 시작하고, 월 3회 면접은 무료입니다.<br/>
          기관·팀 도입은 상담 한 번이면 됩니다.
        </p>`,
);

html = html.replace(
  `<div class="foot-col">
        <h4>Product</h4>
        <a>Discover</a><a>Resume</a><a>Interview</a><a>Practice</a><a>Growth</a><a>Diagnostic</a>
      </div>
      <div class="foot-col">
        <h4>For</h4>
        <a>개인</a><a>대학 취업센터</a><a>기업 채용 · HR</a><a>조직 진단</a>
      </div>`,
  `<div class="foot-col">
        <h4>Product</h4>
        <a>Interview</a><a>Resume</a><a>Growth</a><a href="/products">전체 기능</a>
      </div>
      <div class="foot-col">
        <h4>For</h4>
        <a href="/demo#trial">맛보기</a><a href="/org/setup">기관 도입</a>
      </div>`,
);

const escaped = html
  .replace(/\\/g, "\\\\")
  .replace(/"/g, '\\"')
  .replace(/\r?\n/g, "\\n");

const out = `/* Hybrid marketing home — wedge-focused */\nexport const MARKETING_HOME_HTML = "${escaped}";\n`;
fs.writeFileSync(markupPath, out, "utf8");
console.log("Wrote hybrid marketing-markup.ts");
