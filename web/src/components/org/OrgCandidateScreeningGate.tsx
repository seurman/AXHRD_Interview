import Link from "next/link";

/** 역량평가 SKU 미활성 시 404 대신 안내 화면 */
export function OrgCandidateScreeningGate({
  organizationName,
}: {
  organizationName: string;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          Candidate screening
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">지원자 결과</h1>
      </div>
      <div className="card-luxe space-y-3 p-6">
        <p className="font-medium text-foreground">역량평가 SKU가 필요합니다</p>
        <p className="text-sm text-muted">
          「{organizationName}」 기관에는 조직진단은 활성화되어 있으나, 인터뷰 킷·지원자
          스크리닝(역량평가 SaaS)이 켜져 있지 않습니다. 슈퍼어드민에게 역량평가 entitlement
          활성화를 요청하거나, 쇼케이스 데모 기관으로 전환해 보세요.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/org/diagnosis" className="btn-secondary text-sm">
            조직진단으로 이동
          </Link>
          <Link href="/org/dashboard" className="text-sm text-accent hover:underline">
            코호트 대시보드
          </Link>
        </div>
      </div>
    </div>
  );
}
