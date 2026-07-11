import Link from "next/link";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  /** 페이지 링크 경로. 예: "/admin/users" */
  basePath: string;
  /** page를 제외한 나머지 쿼리스트링 보존용 */
  searchParams?: Record<string, string | undefined>;
};

function buildHref(basePath: string, page: number, searchParams?: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) qs.set(k, v);
    }
  }
  if (page > 1) qs.set("page", String(page));
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * 관리자 목록 페이지 공용 페이지네이션 — 감사·조회 시 200건 하드캡으로 뒷부분을
 * 영영 볼 수 없던 문제(컴플라이언스 리스크)를 해소한다.
 */
export function AdminPagination({ page, pageSize, total, basePath, searchParams }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--platform-border,var(--card-border))] pt-4 text-xs text-muted">
      <span>
        {start}–{end} / 총 {total}건 · {page} / {totalPages}페이지
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={buildHref(basePath, Math.max(1, page - 1), searchParams)}
          aria-disabled={page <= 1}
          className={`rounded-lg border border-card-border px-3 py-1.5 font-medium transition ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-background/60"
          }`}
        >
          이전
        </Link>
        <Link
          href={buildHref(basePath, Math.min(totalPages, page + 1), searchParams)}
          aria-disabled={page >= totalPages}
          className={`rounded-lg border border-card-border px-3 py-1.5 font-medium transition ${
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-background/60"
          }`}
        >
          다음
        </Link>
      </div>
    </nav>
  );
}
