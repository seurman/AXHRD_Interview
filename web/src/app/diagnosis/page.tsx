import Link from "next/link";

export default function DiagnosisMarketingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gold">ARC Index</p>
        <h1 className="text-3xl font-bold text-foreground">조직진단 — ARC Index</h1>
        <p className="text-muted">
          OHI·ORI·OVI·OAI 4축 통합 조직진단. 완전 익명·팀 단위 집계·5명 미만 보호 원칙을 지킵니다.
          채용 면접 제품과 별도 SKU로 제공됩니다.
        </p>
      </header>

      <div className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">1단계 제공 범위</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted">
          <li>문항뱅크 + 웨이브·팀 구조 + 팀별 응답 링크</li>
          <li>결정론적 스코어링 (평균·가중합성·임계값 판정)</li>
          <li>회귀(β)·OLS·HLM·LDA 통계추정은 2~3단계 예정</li>
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
        실제 응답·리포트는 계약 기관(diagnosticEnabled)의 조직 컨텍스트에서만 이용할 수 있습니다.
      </p>
    </div>
  );
}
