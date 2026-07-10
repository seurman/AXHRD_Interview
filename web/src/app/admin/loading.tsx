/** 사이드바는 layout에 유지되고, 콘텐츠 영역만 즉시 스켈레톤 표시 */
export default function AdminLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="페이지 로딩 중">
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-24 animate-pulse rounded-md bg-[var(--platform-border)]" />
        <div className="h-9 w-28 animate-pulse rounded-md bg-[var(--platform-border)]" />
      </div>
      <div className="platform-panel overflow-hidden">
        <div className="h-12 animate-pulse border-b border-[var(--platform-border)] bg-[var(--platform-canvas-highlight)]" />
        <div className="grid gap-4 p-6 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="platform-metric-tile h-20 animate-pulse opacity-60" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-[var(--platform-border)]" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="platform-panel h-48 animate-pulse opacity-70" />
        ))}
      </div>
    </div>
  );
}
