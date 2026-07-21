import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const htmlPath = path.join(root, "design_handoff_axhrd_homepage", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error("No <style> block");
let pageCss = stripCssComments(styleMatch[1].trim());

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error("No <body>");
let body = bodyMatch[1];

body = body
  .replace(/<nav class="top">[\s\S]*?<\/nav>\s*/g, "")
  .replace(/<script>[\s\S]*?<\/script>\s*/g, "")
  .replace(/src="assets\//g, 'src="/brand/chapbook/')
  .trim();

const PRODUCT_HREFS = [
  "/discover",
  "/resume-review",
  "/auth/register?next=/interview/setup",
  "/practice/path",
  "/dashboard",
  "/diagnosis",
];

let cardIdx = 0;
body = body.replace(/<a class="prod-card" href="#"([^>]*)>/g, (_m, extra) => {
  const href = PRODUCT_HREFS[cardIdx] ?? "/discover";
  cardIdx += 1;
  return `<a class="prod-card" href="${href}"${extra}>`;
});

body = body.replace('<section class="cta">', '<section class="cta luxe-reveal" id="cta"><div class="cta-unbox-fill" aria-hidden="true"></div>');
body = body.replace('<div class="hero-preview">', '<div class="hero-preview luxe-reveal luxe-reveal-hero">');
body = body.replace('<section class="process" id="process">', '<section class="process luxe-reveal" id="process">');

const PRICING_STRIP = `
  <section class="pricing-strip" id="pricing">
    <div class="pricing-strip-inner">
      <div>
        <div class="sec-eyebrow">Pricing · 시작은 무료</div>
        <h2 class="pricing-strip-title">월 3회 면접은 무료,<br/>필요할 때만 업그레이드하세요.</h2>
      </div>
      <div class="pricing-strip-actions">
        <p class="pricing-strip-copy">가입만 하면 바로 시작합니다. 기관·팀 도입은 별도 안내해 드립니다.</p>
        <div class="pricing-strip-btns">
          <a href="#" class="btn btn-primary" data-cta="start">무료로 시작 →</a>
          <a href="/pricing" class="btn btn-ghost">요금제 보기</a>
        </div>
      </div>
    </div>
  </section>
`;

body = applyMarketingOptimizations(body);

function applyMarketingOptimizations(html) {
  let out = html;

  out = out.replace(
    `<div class="hero-ctas">
            <a href="#" class="btn btn-primary btn-lg">지금 시작하기 →</a>
            <a href="#process" class="arrow-link">성장 여정 보기 <span class="arr">→</span></a>
          </div>`,
    `<div class="hero-ctas">
            <a href="#" class="btn btn-primary btn-lg" data-cta="start">지금 시작하기 →</a>
            <a href="#" class="btn btn-ghost btn-lg" data-cta="demo">샘플 면접 체험 →</a>
          </div>
          <p class="hero-micro">신용카드 없이 시작 · <a href="/pricing" class="price-link">월 3회 면접 무료</a></p>
          <div class="hero-secondary-link"><a href="#process" class="arrow-link">성장 여정 보기 <span class="arr">→</span></a></div>`,
  );

  out = out.replace(
    `<div class="proof">
        <div class="proof-label">국내 대학 취업센터 ·<br/>기업 HR팀에서 사용 중</div>
        <div class="proof-logos">
          <span>서울대학교</span>
          <span class="serif">Yonsei</span>
          <span>KAIST</span>
          <span class="serif">Korea Univ.</span>
          <span>POSTECH</span>
          <span class="serif">Sungkyunkwan</span>
        </div>
      </div>`,
    `<div class="proof proof-trust">
        <div class="proof-label">검증 가능한<br/>준비 경험</div>
        <div class="proof-pills">
          <span>루브릭 기반 채점</span>
          <span>자소서 근거 인용</span>
          <span>감정 AI 없음</span>
          <span>개인·기관 동일 데이터</span>
        </div>
      </div>`,
  );

  out = out.replace(
    `<span class="lbl">Competency θ</span>`,
    `<span class="lbl">역량 점수 <span class="term-muted">θ</span></span>`,
  );

  out = out.replaceAll("근거 인용 · IRT", "근거 인용 · 난이도 맞춤");
  out = out.replace(
    "θ 스케일과 스킬 트리로 성장을 숫자로 남기고",
    "역량 점수(θ)와 스킬 트리로 성장을 숫자로 남기고",
  );
  out = out.replace(
    "<span class=\"tag\">θ · 스킬 트리</span>",
    "<span class=\"tag\">역량 점수 · 스킬 트리</span>",
  );
  out = out.replace(
    "ARC Index로 조직의 강·약점을 진단하고",
    "조직 진단 지표(ARC)로 강·약점을 진단하고",
  );
  out = out.replace(
    "<span class=\"tag\">ARC Index</span>",
    "<span class=\"tag\">조직 진단 ARC</span>",
  );
  out = out.replace("IRT · Adaptive", "난이도 맞춤 · Adaptive");
  out = out.replace("θ score · Cohort", "역량 점수 · Cohort");
  out = out.replace(
    "준비의 모든 순간이 θ 점수와 스킬 트리에 쌓입니다.",
    "준비의 모든 순간이 역량 점수와 스킬 트리에 쌓입니다.",
  );
  out = out.replace(
    "<div class=\"n\">+6<span class=\"u\">θ</span></div><div class=\"l\">Growth</div>",
    "<div class=\"n\">+6<span class=\"u\">점</span></div><div class=\"l\">역량 성장</div>",
  );
  out = out.replace("스와이프 연습과 θ · 스킬 트리로", "스와이프 연습과 역량 점수 · 스킬 트리로");
  out = out.replace(
    "<h3>ARC Index로<br/>조직을 <span class=\"serif\">읽습니다</span>.</h3>",
    "<h3>조직 진단(ARC)으로<br/>조직을 읽습니다.</h3>",
  );
  out = out.replace(
    "<li>ARC Index · 조직 역량 3축 진단</li>",
    "<li>조직 진단 ARC · 역량 3축 분석</li>",
  );

  out = out.replace(
    `<div class="problem-outro">
        <div class="say">이제, 명확한 역량 기준과<br/>연결된 준비 · 평가로 <span class="accent">해결하세요.</span></div>
        <a href="#process" class="btn on-dark btn-lg" style="flex-shrink: 0;">해결책 보기 →</a>
      </div>`,
    `<div class="problem-outro">
        <div class="say">이제, 명확한 역량 기준과<br/>연결된 준비 · 평가로 <span class="accent">해결하세요.</span></div>
        <div class="problem-outro-actions">
          <a href="#process" class="btn on-dark btn-lg">해결책 보기 →</a>
          <a href="/org/setup" class="btn on-dark-ghost btn-lg" data-cta="org">기관 도입 상담 →</a>
        </div>
      </div>`,
  );

  out = out.replace(
    `<section class="testimony">
    <div class="quote-mark">"</div>
    <div class="quote-text">
      질문이 자소서에서 나오니까,<br/>
      학생들이 <span class="accent">진짜 자기 이야기</span>를 하기 시작했어요.
    </div>
    <div class="quote-author">
      <strong>이지현</strong> · 서울권 A대학 취업센터장 · 누적 응시 1,200명
    </div>
  </section>`,
    `<section class="testimony testimony-value">
    <div class="quote-mark">"</div>
    <div class="quote-text">
      자소서에서 나온 질문이면,<br/>
      <span class="accent">진짜 자기 이야기</span>를 하게 됩니다.
    </div>
    <div class="quote-author">AXHRD가 지향하는 면접 경험</div>
  </section>`,
  );

  out = out.replace(
    `          <li>답변 원문은 나만 · 인용 근거는 항상 함께</li>
        </ul>
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">나의 성장 · Last 30 days</div>`,
    `          <li>답변 원문은 나만 · 인용 근거는 항상 함께</li>
        </ul>
        <div class="aud-cta-row">
          <a href="#" class="btn btn-accent" data-cta="demo">샘플 면접 체험 →</a>
          <a href="#" class="btn btn-ghost" data-cta="start">무료로 시작 →</a>
        </div>
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">나의 성장 · Last 30 days</div>`,
  );

  const orgAudCta = `<div class="aud-cta-row">
          <a href="/org/setup" class="btn btn-primary" data-cta="org">기관 도입 상담 →</a>
        </div>`;

  out = out.replace(
    `          <li>개인 답변 원문은 지키고, 집계 지표만 확인</li>
        </ul>
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">2026 여름 웨이브`,
    `          <li>개인 답변 원문은 지키고, 집계 지표만 확인</li>
        </ul>
        ${orgAudCta}
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">2026 여름 웨이브`,
  );

  out = out.replace(
    `          <li>ATS · 사내 HRIS와 연동 가능</li>
        </ul>
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">지원자 랭킹`,
    `          <li>ATS · 사내 HRIS와 연동 가능</li>
        </ul>
        ${orgAudCta}
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">지원자 랭킹`,
  );

  out = out.replace(
    `          <li>익명 집계 · 개인 지목 없음</li>
        </ul>
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">ARC Index`,
    `          <li>익명 집계 · 개인 지목 없음</li>
        </ul>
        ${orgAudCta}
      </div>
      <div class="aud-mock">
        <div class="mock-head"><div class="t">ARC Index`,
  );

  out = out.replace(
    "  </section>\n\n  <!-- ═══════════════ PROBLEM ═══════════════ -->",
    `  </section>\n${PRICING_STRIP}\n\n  <!-- ═══════════════ PROBLEM ═══════════════ -->`,
  );

  return applyPersuasiveCopy(out);
}

/** 문장 중간 serif 제거 + 설득형 한국어 카피 */
function applyPersuasiveCopy(html) {
  let out = html.replace(/<span class="serif">([^<]*)<\/span>/g, "$1");

  const pairs = [
    // Hero
    [
      `<div class="pill"><span class="live-dot"></span>월 3회 무료 면접 · Live</div>
        <div class="caption">역량 성장 플랫폼 · v2</div>`,
      `<div class="pill"><span class="live-dot"></span>월 3회 무료 면접</div>
        <div class="caption">역량 성장 플랫폼</div>`,
    ],
    [
      `<h1>
            쌓이는 역량,<br/>
            보이는 준비<span class="dot">.</span>
          </h1>`,
      `<h1>
            연습할수록 답이 단단해지고,<br/>
            역량 점수가 쌓입니다<span class="dot">.</span>
          </h1>`,
    ],
    [
      `<div class="pill"><span class="live-dot"></span>월 3회 무료 면접</div>
        <div class="caption">역량 성장 플랫폼</div>`,
      `<div class="pill"><span class="live-dot"></span>월 3회 무료 · 음성 AI 면접</div>
        <div class="caption">자소서와 면접을 잇는 역량 플랫폼</div>`,
    ],
    [
      `<p class="sub">
            자소서 · 면접 · 진단까지 <strong>한 계정</strong>에서.<br/>
            감정 AI 없이, <strong>같은 루브릭</strong>으로 공정하게.<br/>
            질문은 자소서 문장을 <strong>근거로 인용</strong>합니다.
          </p>`,
      `<p class="sub">
            공고와 자소서에서 질문을 만들고, <strong>실전처럼 말로 연습합니다.</strong><br/>
            같은 기준으로 채점하고, 자소서 기반 질문으로 현장감을 살립니다. 표정·감정 AI는 쓰지 않습니다.
          </p>`,
    ],
    [
      `<p class="sub">
            면접만, 자소서만 따로 준비할 필요 없습니다.<br/>
            <strong>한 계정</strong>에서 연습하고, <strong>같은 기준</strong>으로 평가받고, 성장은 <strong>숫자로 남습니다.</strong><br/>
            질문은 자소서에서 나옵니다. 꾸민 말이 아니라, 내 이야기로 답하게 됩니다.
          </p>`,
      `<p class="sub">
            공고와 자소서에서 질문을 만들고, <strong>실전처럼 말로 연습합니다.</strong><br/>
            같은 기준으로 채점하고, 자소서 기반 질문으로 현장감을 살립니다. 표정·감정 AI는 쓰지 않습니다.
          </p>`,
    ],
  [
      `<p class="hero-micro">신용카드 없이 시작 · <a href="/pricing" class="price-link">월 3회 면접 무료</a></p>`,
      `<p class="hero-micro">카드 등록 없이 시작 · <a href="/pricing" class="price-link">월 3회 면접 무료</a></p>`,
    ],
    [
      `<a href="#" class="btn btn-primary btn-lg" data-cta="start">지금 시작하기 →</a>
            <a href="#" class="btn btn-ghost btn-lg" data-cta="demo">샘플 면접 체험 →</a>`,
      `<a href="#" class="btn btn-primary btn-lg" data-cta="start">무료로 시작하기 →</a>
            <a href="#" class="btn btn-ghost btn-lg" data-cta="demo">면접 1문항 맛보기 →</a>`,
    ],
    // Trust
    [
      `<div class="proof-label">검증 가능한<br/>준비 경험</div>
        <div class="proof-pills">
          <span>루브릭 기반 채점</span>
          <span>자소서 근거 인용</span>
          <span>감정 AI 없음</span>
          <span>개인·기관 동일 데이터</span>
        </div>`,
      `<div class="proof-label">검증 가능한<br/>면접 준비</div>
        <div class="proof-pills">
          <span>왜 이 점수인지, 근거와 함께</span>
          <span>질문은 자소서에서 나옵니다</span>
          <span>답변 내용만 봅니다</span>
          <span>연습 기록은 숫자로 남습니다</span>
        </div>`,
    ],
    // Products head
    [
      `<div class="sec-eyebrow">Product lineup · 6 modules</div>
        <h2 class="sec-title">필요한 모듈만 켜고,<br/>데이터는 하나에.</h2>`,
      `<div class="sec-eyebrow">Solution · 핵심 모듈</div>
        <h2 class="sec-title">필요한 것만 쓰고,<br/>성장 기록은 한곳에.</h2>`,
    ],
    [
      `<div class="sec-sub">
        자기탐색 · 자소서 · 면접 · 연습 · 역량 · 조직 진단.<br/>
        개인과 기관이 같은 역량 언어를 씁니다.
      </div>`,
      `<div class="sec-sub">
        탐색부터 면접·진단까지 이어집니다.<br/>
        개인의 준비와 기관의 평가가 같은 말로 통합니다.
      </div>`,
    ],
    // Product cards
    [`<div class="prod-name">나를 발견하기</div>
        <p class="prod-desc">강점 · 가치관 카드로 스토리의 뼈대를 만듭니다.</p>`,
      `<div class="prod-name">나를 발견하기</div>
        <p class="prod-desc">강점과 가치관을 정리해, 자소서와 면접의 뼈대를 만듭니다.</p>`],
    [`<div class="prod-name">자소서 리뷰</div>
        <p class="prod-desc">JD 키워드와 문장 구조를 맞추고, 면접 질문의 근거를 만듭니다.</p>`,
      `<div class="prod-name">자소서 리뷰</div>
        <p class="prod-desc">공고에 맞게 문장을 다듬고, 면접에서 물어볼 근거를 남깁니다.</p>`],
    [`<div class="prod-name" style="color: var(--cream-100)">AI 면접</div>
        <p class="prod-desc" style="color: rgba(245,237,228,0.6)">자소서 인용 질문에 음성으로 답하고, 꼬리질문 1회로 깊이를 봅니다.</p>`,
      `<div class="prod-name" style="color: var(--cream-100)">AI 면접</div>
        <p class="prod-desc" style="color: rgba(245,237,228,0.6)">자소서 기반의 질문으로 현장감을 살립니다. 음성으로 답하고, 꼬리질문으로 깊이까지 봅니다.</p>`],
    [`<div class="prod-name">질문 덱</div>
        <p class="prod-desc">스와이프로 연습, 직무별로 저장. 짧게 자주, 답변의 근육을 만듭니다.</p>`,
      `<div class="prod-name">역량 학습 패스</div>
        <p class="prod-desc">개념·원리부터 말하기 드릴·인증까지. 가볍게 쌓고, 필요할 때 모의로 측정합니다.</p>`],
    [`<div class="prod-name">질문 덱</div>
        <p class="prod-desc">짧게 자주 연습합니다. 직무별로 저장해, 답하는 감각을 키웁니다.</p>`,
      `<div class="prod-name">역량 학습 패스</div>
        <p class="prod-desc">개념·원리부터 말하기 드릴·인증까지. 가볍게 쌓고, 필요할 때 모의로 측정합니다.</p>`],
    [`<div class="prod-name">역량 트래킹</div>
        <p class="prod-desc">역량 점수(θ)와 스킬 트리로 성장을 숫자로 남기고, 인증서로 증명합니다.</p>`,
      `<div class="prod-name">역량 트래킹</div>
        <p class="prod-desc">연습할수록 점수가 쌓입니다. 성장 궤적을 숫자로 남기고 확인합니다.</p>`],
    [`<div class="prod-name">조직 진단</div>
        <p class="prod-desc">조직 진단 지표(ARC)로 강·약점을 진단하고, 웨이브 · 팀 리포트로 축약합니다.</p>`,
      `<div class="prod-name">조직 진단</div>
        <p class="prod-desc">팀·조직의 강점과 약점을 진단하고, 리포트로 한눈에 봅니다.</p>`],
    // Problem
    [
      `<div class="sec-eyebrow">Problem · 이런 고민 있으신가요</div>
      <h2 class="sec-title">면접·자소서·진단이<br/>따로 놀지 않게<span style="color: var(--coral-300)">.</span></h2>
      <p class="problem-sub">준비도 운영도 성과가 남지 않을 때, 문제는 도구가 아니라 <em style="font-family: var(--font-serif); color: var(--cream-100);">연결</em>입니다.</p>`,
      `<div class="sec-eyebrow">Problem · 이런 고민 있으시죠</div>
      <h2 class="sec-title">면접·자소서·진단,<br/>왜 따로 놀까요<span style="color: var(--coral-300)">.</span></h2>
      <p class="problem-sub">열심히 준비해도 기록이 남지 않고, 평가도 이어지지 않을 때가 있습니다. 도구가 부족한 게 아니라, <em style="color: var(--cream-100); font-style: normal; font-weight: 600;">연결이 끊긴 것</em>입니다.</p>`,
    ],
    [
      `<h4>면접만으로<br/>역량 검증이 어려움</h4>
          <p>자소서와 실제 답변이 연결되지 않아, 누가 무엇을 할 수 있는지 판단하기 어렵습니다.</p>`,
      `<h4>면접만으로는<br/>역량을 확신하기 어렵습니다</h4>
          <p>자소서와 실제 답이 이어지지 않으면, 누가 무엇을 할 수 있는지 판단하기 어렵습니다.</p>`,
    ],
    [
      `<h4>준비 도구가<br/>흩어져 있음</h4>
          <p>자소서 첨삭, 모의면접, 역량 관리가 각각 다른 도구에 있어 데이터가 쌓이지 않습니다.</p>`,
      `<h4>준비 도구가<br/>여기저기 흩어져 있습니다</h4>
          <p>자소서, 모의면접, 역량 관리가 따로 있으면 데이터가 쌓이지 않습니다.</p>`,
    ],
    [
      `<h4>기관 코호트<br/>성과 측정의 어려움</h4>
          <p>완료율·역량 평균·팀별 격차를 한눈에 보기 어렵고, 리포트 작성에 시간이 듭니다.</p>`,
      `<h4>기관에서는<br/>성과를 한눈에 보기 어렵습니다</h4>
          <p>완료율, 역량 평균, 팀별 격차를 매번 손으로 정리해야 합니다.</p>`,
    ],
    [
      `<h4>채점 기준의<br/>불투명함</h4>
          <p>평가자마다 기준이 달라 공정성과 재현성을 확보하기 어렵습니다.</p>`,
      `<h4>채점 기준이<br/>사람마다 달라집니다</h4>
          <p>면접관마다 기준이 다르면, 공정하게 비교하기 어렵습니다.</p>`,
    ],
    [
      `<div class="say">이제, 명확한 역량 기준과<br/>연결된 준비 · 평가로 <span class="accent">해결하세요.</span></div>`,
      `<div class="say">이제는 기준을 맞추고,<br/>준비와 평가를 <span class="accent">한 줄로 이으세요.</span></div>`,
    ],
  [
      `<a href="#process" class="btn on-dark btn-lg">해결책 보기 →</a>
          <a href="/org/setup" class="btn on-dark-ghost btn-lg" data-cta="org">기관 도입 상담 →</a>`,
      `<a href="#process" class="btn on-dark btn-lg">어떻게 이어지나요 →</a>
          <a href="/org/setup" class="btn on-dark-ghost btn-lg" data-cta="org">기관 도입 문의 →</a>`,
    ],
    // Process
    [
      `<div class="sec-eyebrow">Growth loop · 4 steps</div>
        <h2 class="sec-title">탐색에서 면접까지,<br/>끊기지 않는 여정.</h2>`,
      `<div class="sec-eyebrow">Growth loop · 4단계</div>
        <h2 class="sec-title">탐색부터 면접까지,<br/>끊기지 않습니다.</h2>`,
    ],
    [
      `<div class="sec-sub">
        발견한 강점이 자소서와 면접 질문으로 이어지고,<br/>답변은 역량 점수와 코호트 지표로 쌓입니다.
      </div>`,
      `<div class="sec-sub">
        찾은 강점이 자소서와 면접 질문으로 이어지고,<br/>자소서 기반 질문으로 현장감 있게 연습합니다.
      </div>`,
    ],
    [`<h4>나를 발견하기</h4>
        <p>강점 · 가치관 카드로 스토리의 뼈대를 만듭니다.</p>`,
      `<h4>나를 발견하기</h4>
        <p>강점과 가치관을 정리해 이야기의 뼈대를 만듭니다.</p>`],
    [`<h4>자소서 리뷰</h4>
        <p>JD 키워드와 문장 구조를 맞추고, 질문의 근거를 만듭니다.</p>`,
      `<h4>자소서 리뷰</h4>
        <p>공고에 맞게 다듬고, 면접 질문의 근거를 남깁니다.</p>`],
    [`<h4>구조화 AI 면접</h4>
        <p>자소서 인용 질문에 음성으로 답하고, 꼬리질문 1회로 깊이를 봅니다.</p>`,
      `<h4>AI 면접</h4>
        <p>자소서 기반의 질문으로 현장감을 살립니다. 음성으로 답하고, 꼬리질문으로 깊이를 봅니다.</p>`],
    [`<h4>질문 덱 · 역량 트래킹</h4>
        <p>스와이프 연습과 역량 점수 · 스킬 트리로 성장을 숫자로 남깁니다.</p>`,
      `<h4>학습 패스 · 역량 기록</h4>
        <p>개념·원리·말하기 드릴을 쌓고, 모의면접으로 점수를 남깁니다.</p>`],
    [`<h4>연습 · 역량 기록</h4>
        <p>짧게 자주 연습하고, 성장은 점수와 기록으로 남깁니다.</p>`,
      `<h4>학습 패스 · 역량 기록</h4>
        <p>개념·원리·말하기 드릴을 쌓고, 모의면접으로 점수를 남깁니다.</p>`],
    // Why
    [
      `<div class="sec-eyebrow">Why AXHRD · 4 principles</div>
          <h2 class="sec-title">공정한 채점, 맞는 난이도,<br/>눈에 보이는 성장.</h2>`,
      `<div class="sec-eyebrow">Why AXHRD</div>
          <h2 class="sec-title">공정하게 채점하고,<br/>성장은 남깁니다.</h2>`,
    ],
    [
      `<div class="sec-sub">
          감정 AI 없이 루브릭 기반으로 채점합니다.<br/>기준은 문서로, 결과는 인용 문장과 함께 제공됩니다.
        </div>`,
      `<div class="sec-sub">
          감정 AI 없이, 문서화된 루브릭으로 채점합니다.<br/>왜 이 점수인지, 근거 문장과 함께 확인할 수 있습니다.
        </div>`,
    ],
    [`<h4>투명한 채점</h4>
          <p>감정 AI 없이, 같은 루브릭으로 세션을 공정하게 비교합니다.</p>`,
      `<h4>투명한 채점</h4>
          <p>이력서가 아니라, 답변으로 평가합니다. 왜 이 점수인지 근거와 함께 확인합니다.</p>`],
    [`<h4>맞춤 난이도</h4>
          <p>실력에 맞는 문항을 고르고, 왜 이 질문인지도 함께 알려 줍니다.</p>`,
      `<h4>맞는 난이도</h4>
          <p>실력에 맞는 질문을 고릅니다. 왜 이 질문인지도 함께 알려 드립니다.</p>`],
    [`<h4>성장이 남습니다</h4>
          <p>개인 역량 점수와 기관 코호트 지표를 숫자로 남깁니다.</p>`,
      `<h4>성장이 남습니다</h4>
          <p>연습할수록 점수가 쌓입니다. 합격 전에 실력이 보이고, 기록은 숫자로 남습니다.</p>`],
    [`<h4>NCS 공식 역량</h4>
          <p>직업기초능력 정의를 루브릭에 반영한 한국형 기준입니다.</p>`,
      `<h4>NCS 기반 역량</h4>
          <p>직업기초능력(NCS) 정의를 루브릭에 반영했습니다. 한국 현장에 맞는 기준입니다.</p>`],
    // Audiences head
    [
      `<div class="sec-eyebrow">Platform · 4 audiences</div>
        <h2 class="sec-title">개인 성장과 기관 운영,<br/>같은 데이터 위에서.</h2>`,
      `<div class="sec-eyebrow">For · 누구를 위한가</div>
        <h2 class="sec-title">개인의 성장과<br/>기관의 운영, 같은 데이터로.</h2>`,
    ],
    [
      `<div class="sec-sub">
        답변 원문은 개인에게만.<br/>기관에는 집계 지표만 제공합니다.
      </div>`,
      `<div class="sec-sub">
        답변 원문은 본인만 볼 수 있습니다.<br/>기관에는 집계된 지표만 전달합니다.
      </div>`,
    ],
    // Audience panels
    [
      `<h3>혼자 연습해도<br/>기록은 남는다.</h3>
        <p>월 3회 무료 면접, 자소서 리뷰, 스와이프 연습 덱. 준비의 모든 순간이 역량 점수와 스킬 트리에 쌓입니다.</p>
        <ul class="aud-checks">
          <li>회원가입 후 월 3회 무료 면접</li>
          <li>자소서 → 질문 → 역량 점수가 한 계정에 연결</li>
          <li>답변 원문은 나만 · 인용 근거는 항상 함께</li>
        </ul>`,
      `<h3>혼자 연습해도<br/>기록은 남습니다</h3>
        <p>월 3회 무료 면접, 자소서 리뷰, 질문 연습까지. 준비할 때마다 역량 점수가 쌓입니다.</p>
        <ul class="aud-checks">
          <li>가입 후 월 3회 면접 무료</li>
          <li>자소서·면접·점수가 한 계정에 연결</li>
          <li>답변은 나만 보고, 채점 근거는 함께 확인</li>
        </ul>`,
    ],
    [
      `<h3>진단 웨이브를<br/>한번에 배포.</h3>
        <p>취업센터는 인터뷰 킷을 설계하고, 학생은 링크만 열면 됩니다. 완료율·역량 평균·팀별 리포트를 자동으로 받아보세요.</p>
        <ul class="aud-checks">
          <li>기관 킷 · 공유 링크로 대규모 배포</li>
          <li>완료율 · 역량 평균 · 학과별 격차 리포트</li>
          <li>개인 답변 원문은 지키고, 집계 지표만 확인</li>
        </ul>`,
      `<h3>대규모 운영도<br/>링크 한 번으로</h3>
        <p>킷을 만들고 링크만 내면 됩니다. 완료율·역량 평균·학과별 리포트는 자동으로 모입니다.</p>
        <ul class="aud-checks">
          <li>공유 링크로 대규모 배포</li>
          <li>완료율·평균·학과별 격차 리포트</li>
          <li>개인 답변은 보호, 집계만 확인</li>
        </ul>`,
    ],
    [
      `<h3>같은 루브릭으로<br/>공정하게 비교.</h3>
        <p>지원자 풀이 커져도 평가자별 편차 없이. 자소서 인용 질문과 재현 가능한 채점 기준으로 감이 아닌 증거로 결정하세요.</p>
        <ul class="aud-checks">
          <li>JD 업로드 → 자동 질문 세트 생성</li>
          <li>평가자 간 재현성 · 감정 AI 없이</li>
          <li>ATS · 사내 HRIS와 연동 가능</li>
        </ul>`,
      `<h3>지원자가 많아져도<br/>기준은 같습니다</h3>
        <p>자소서에서 나온 질문, 문서화된 채점 기준. 감이 아니라 근거로 비교합니다.</p>
        <ul class="aud-checks">
          <li>공고 올리면 질문 세트 자동 생성</li>
          <li>면접관마다 같은 기준, 감정 AI 없음</li>
          <li>사내 HR 시스템과 연동 가능</li>
        </ul>`,
    ],
    [
      `<h3>조직 진단(ARC)으로<br/>조직을 읽습니다.</h3>
        <p>웨이브 · 팀 리포트로 조직 진단을 축약. 팀별 강·약점과 성장 궤적을 한눈에 확인하고, 개입 시점을 놓치지 않습니다.</p>
        <ul class="aud-checks">
          <li>조직 진단 ARC · 역량 3축 분석</li>
          <li>팀별 리포트 · 개입 시점 알림</li>
          <li>익명 집계 · 개인 지목 없음</li>
        </ul>`,
      `<h3>조직 상태를<br/>숫자로 읽습니다</h3>
        <p>팀·조직 진단을 리포트로 축약합니다. 약한 지점과 개입 시점을 놓치지 않습니다.</p>
        <ul class="aud-checks">
          <li>조직 역량 3축 진단</li>
          <li>팀별 리포트·변화 추적</li>
          <li>익명 집계, 개인 지목 없음</li>
        </ul>`,
    ],
    // Quote
    [
      `자소서에서 나온 질문이면,<br/>
      <span class="accent">진짜 자기 이야기</span>를 하게 됩니다.`,
      `면접 질문이 자소서에서 나오면,<br/>
      <span class="accent">답변도 달라집니다.</span>`,
    ],
    [`<div class="quote-author">AXHRD가 지향하는 면접 경험</div>`,
      `<div class="quote-author">AXHRD가 만들고 싶었던 면접</div>`],
    // CTA
    [
      `<h2>지금,<br/>시작<span class="dot">.</span></h2>
      <div class="cta-right">
        <p class="p">
          개인은 홈에서, 기관은 설정에서.<br/>
          신용카드 없이 시작. 월 3회 면접은 무료입니다.<br/>
          기관 웨이브 · 킷 설계는 세일즈에 문의해 주세요.
        </p>
        <div class="cta-btns">
          <a href="#" class="btn on-dark btn-lg">지금 시작하기 →</a>
          <a href="#" class="btn on-dark-ghost btn-lg">세일즈에 문의</a>`,
      `<h2>지금, 한 문항부터<br/>시작하세요<span class="dot">.</span></h2>
      <div class="cta-right">
        <p class="p">
          개인은 지금 바로, 기관은 상담 한 번으로.<br/>
          카드 없이 시작하고, 월 3회 면접은 무료입니다.<br/>
          대규모 운영·킷 설계는 도입 문의를 이용해 주세요.
        </p>
        <div class="cta-btns">
          <a href="#" class="btn on-dark btn-lg" data-cta="start">무료로 시작하기 →</a>
          <a href="/org/setup" class="btn on-dark-ghost btn-lg" data-cta="org">도입 문의 →</a>
        </div>
      </div>`,
    ],
    // Footer
    [`<p>역량 성장 플랫폼.<br/>자소서 · 면접 · 진단, 한곳에서.</p>`,
      `<p>역량 성장 플랫폼.<br/>준비와 평가, 한곳에서.</p>`],
  ];

  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }

  return out;
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function scopeCss(css, scope) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf("@", i);
    if (at === -1) {
      out.push(scopeRuleBlock(css.slice(i), scope));
      break;
    }
    if (at > i) out.push(scopeRuleBlock(css.slice(i, at), scope));
    const blockEnd = findMatchingBrace(css, at);
    const atRule = css.slice(at, blockEnd + 1);
    if (/^@(keyframes|font-face)\b/.test(atRule.trim())) {
      out.push(atRule);
    } else if (/^@media\b/.test(atRule.trim())) {
      const innerStart = atRule.indexOf("{") + 1;
      const innerEnd = atRule.lastIndexOf("}");
      const prelude = atRule.slice(0, innerStart);
      const inner = atRule.slice(innerStart, innerEnd);
      out.push(`${prelude}${scopeRuleBlock(inner, scope)}}`);
    } else {
      out.push(atRule);
    }
    i = blockEnd + 1;
  }
  return out.join("\n");
}

function findMatchingBrace(text, start) {
  const open = text.indexOf("{", start);
  if (open === -1) return text.length - 1;
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === "{") depth += 1;
    else if (text[j] === "}") {
      depth -= 1;
      if (depth === 0) return j;
    }
  }
  return text.length - 1;
}

function scopeRuleBlock(block, scope) {
  const out = [];
  const chunks = block.split("}");
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const brace = trimmed.indexOf("{");
    if (brace === -1) continue;
    const selectorPart = trimmed.slice(0, brace).trim();
    const bodyPart = trimmed.slice(brace + 1).trim();
    if (!selectorPart) continue;
    const scoped = selectorPart
      .split(",")
      .map((s) => {
        const sel = s.trim();
        if (!sel || sel.startsWith(scope)) return sel;
        return `${scope} ${sel}`;
      })
      .join(", ");
    out.push(`${scoped} { ${bodyPart} }`);
  }
  return out.join("\n\n");
}

pageCss = scopeCss(pageCss, ".ax-home");

const stylesDir = path.join(root, "web/src/styles/marketing");
fs.mkdirSync(stylesDir, { recursive: true });

const colorsSrc = path.join(
  root,
  "design_handoff_axhrd_homepage",
  "colors_and_type.css",
);
let colorsCss = fs.readFileSync(colorsSrc, "utf8");
colorsCss = colorsCss.replace(
  /@import url\('https:\/\/fonts\.googleapis\.com[^']+'\);[\s\S]*?Pretendard[^']+'\);/,
  "@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');",
);
colorsCss = colorsCss.replace(
  /--font-sans:[^;]+;/,
  "--font-sans: var(--font-ibm-plex), var(--font-pretendard), 'Apple SD Gothic Neo', system-ui, sans-serif;",
);
colorsCss = colorsCss.replace(
  /--font-kr:[^;]+;/,
  "--font-kr: var(--font-pretendard), var(--font-ibm-plex), 'Apple SD Gothic Neo', sans-serif;",
);
colorsCss = colorsCss.replace(
  /--font-mono:[^;]+;/,
  "--font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;",
);

const rootEnd = colorsCss.indexOf("}", colorsCss.indexOf(":root"));
const rootBlock = colorsCss.slice(0, rootEnd + 1);
const restCss = colorsCss.slice(rootEnd + 1);
colorsCss = `${rootBlock}\n${scopeRuleBlock(stripCssComments(restCss), ".ax-home")}\n`;

fs.writeFileSync(path.join(stylesDir, "colors_and_type.css"), colorsCss);
fs.writeFileSync(path.join(stylesDir, "homepage-page.css"), `${pageCss}\n`);

const bundle = `/* Marketing homepage — home route only */
@import "./colors_and_type.css";
@import "./homepage-page.css";
@import "./homepage-integrate.css";
@import "./homepage-product-luxe.css";
`;
fs.writeFileSync(path.join(stylesDir, "homepage.css"), bundle);

const outTs = `/* Auto-generated from design_handoff_axhrd_homepage/index.html */\nexport const MARKETING_HOME_HTML = ${JSON.stringify(`<div class="ax-home">${body}</div>`)};\n`;
fs.writeFileSync(
  path.join(root, "web/src/components/landing/marketing/marketing-markup.ts"),
  outTs,
);

console.log("Wrote marketing styles and markup");

import { execSync } from "node:child_process";
execSync("node scripts/apply-hybrid-home-markup.mjs", {
  cwd: path.join(root, "web"),
  stdio: "inherit",
});
