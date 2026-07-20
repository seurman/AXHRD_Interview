import Link from "next/link";

export default function DiagnosisMarketingPage() {
  return (
    <div className="product-stage product-stage--wide mx-auto max-w-3xl px-2 py-6 sm:px-4 sm:py-10">
      <div className="product-stage__inner !max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="product-stage__kicker">ARC Index</p>
          <h1 className="product-stage__title">조직진단 — ARC Index</h1>
          <p className="product-stage__lead">
            OHI·ORI·OVI·OAI 4축 통합 조직진단. 완전 익명·팀 단위 집계·5명 미만 보호 원칙을
            지킵니다. 채용 면접 제품과 별도 SKU로 제공됩니다.
          </p>
        </header>

        <div className="setup-section">
          <div className="setup-section__head">
            <span className="badge-step" aria-hidden>
              1
            </span>
            <div>
              <p className="section-eyebrow">Scope</p>
              <h2 className="setup-section__title">1단계 제공 범위</h2>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-gold">•</span>
              문항뱅크 + 웨이브·팀 구조 + 팀별 응답 링크
            </li>
            <li className="flex gap-2">
              <span className="text-gold">•</span>
              결정론적 스코어링 (평균·가중합성·임계값 판정)
            </li>
            <li className="flex gap-2">
              <span className="text-gold">•</span>
              회귀(β)·OLS·HLM·LDA 통계추정은 2~3단계 예정
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/auth/login?next=/org/diagnosis" className="btn-primary">
            기관 관리자 로그인
          </Link>
          <a href="mailto:contact@axhrd.com" className="btn-secondary">
            도입 문의
          </a>
        </div>

        <p className="text-xs text-muted">
          실제 응답·리포트는 계약 기관(diagnosticEnabled)의 조직 컨텍스트에서만 이용할 수
          있습니다.
        </p>
      </div>
    </div>
  );
}
