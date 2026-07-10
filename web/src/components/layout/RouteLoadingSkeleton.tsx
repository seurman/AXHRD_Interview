/** 메뉴 클릭 직후 콘텐츠 영역에 즉시 표시되는 공통 스켈레톤 */
export function RouteLoadingSkeleton({ label = "페이지 로딩 중" }: { label?: string }) {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label={label}>
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-primary/10" />
        <div className="h-8 w-56 max-w-full rounded bg-primary/10" />
        <div className="h-4 w-full max-w-lg rounded bg-primary/5" />
      </div>
      <div className="card-luxe h-52 opacity-80" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-luxe h-36 opacity-70" />
        <div className="card-luxe h-36 opacity-70" />
      </div>
    </div>
  );
}
