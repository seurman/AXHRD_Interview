import Link from "next/link";
import { ArrowRight, FileText, Mic2, Sparkles } from "lucide-react";

export type ActivityItem = {
  id: string;
  kind: "interview" | "discover" | "resume";
  title: string;
  subtitle: string;
  href: string;
  /** 역량 라벨(모의면접만) — "문제해결" 같은 배지로 표시 */
  competency?: string;
  /** 시작 시각 — completedAt과 함께 있으면 소요 시간을 보여줄 수 있다 */
  startedAt?: string;
  completedAt: string;
};

function kindIcon(kind: ActivityItem["kind"]) {
  if (kind === "interview") return Mic2;
  if (kind === "discover") return Sparkles;
  return FileText;
}

function kindLabel(kind: ActivityItem["kind"]) {
  if (kind === "interview") return "모의면접";
  if (kind === "discover") return "자기발견 인터뷰";
  return "자소서 첨삭";
}

/** "7월 13일 (월)" 형태의 날짜 그룹 헤더 */
function formatDateHeading(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
}

function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/** 시작~완료 소요 시간을 "12분" 같은 짧은 문자열로 — 계산 불가하거나 비정상이면 null */
function formatDuration(startedAt: string | undefined, completedAt: string): string | null {
  if (!startedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0 || ms > 1000 * 60 * 60 * 6) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "1분 미만";
  if (minutes < 60) return `${minutes}분`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

/** 최신순으로 정렬된 items를 날짜(YYYY-MM-DD, 로컬 기준)별로 묶는다 — 순서 유지 */
function groupByDate(items: ActivityItem[]): Array<{ dateKey: string; items: ActivityItem[] }> {
  const groups: Array<{ dateKey: string; items: ActivityItem[] }> = [];
  const indexByKey = new Map<string, number>();
  for (const item of items) {
    const d = new Date(item.completedAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    let idx = indexByKey.get(dateKey);
    if (idx === undefined) {
      idx = groups.length;
      groups.push({ dateKey, items: [] });
      indexByKey.set(dateKey, idx);
    }
    groups[idx].items.push(item);
  }
  return groups;
}

/** viewAllHref를 주면(홈 미리보기) "전체 보기" 링크가 뜨고, 안 주면(전체 활동 페이지) 목록만 보여준다. */
export function RecentActivityPanel({
  items,
  viewAllHref,
}: {
  items: ActivityItem[];
  viewAllHref?: string;
}) {
  if (items.length === 0) {
    return (
      <section id="activity" className="scroll-mt-24">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Continue</p>
          <h2 className="text-lg font-bold text-foreground">내 활동</h2>
          <p className="mt-1 text-sm text-muted">완료한 세션과 리포트가 여기에 모입니다.</p>
        </div>
        <div className="card-luxe border-dashed p-8 text-center text-sm text-muted">
          아직 완료한 활동이 없습니다. 성장 메뉴에서 자기발견이나 모의면접을 시작해 보세요.
        </div>
      </section>
    );
  }

  const groups = groupByDate(items);

  return (
    <section id="activity" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Continue</p>
          <h2 className="text-lg font-bold text-foreground">내 활동</h2>
          <p className="mt-1 text-sm text-muted">언제, 어떤 역량으로 면접했는지 한눈에 확인하세요.</p>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            전체 보기
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.dateKey}>
            <p className="mb-2 text-xs font-semibold text-muted">{formatDateHeading(group.dateKey)}</p>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const Icon = kindIcon(item.kind);
                const duration = formatDuration(item.startedAt, item.completedAt);
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      href={item.href}
                      className="card-luxe group flex items-start gap-3 p-4 transition hover:border-gold/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="block font-medium text-foreground group-hover:text-gold">
                            {item.title}
                          </span>
                          {item.competency && (
                            <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
                              {item.competency}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {kindLabel(item.kind)} · {item.subtitle}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted/80">
                          <span>{formatTimeOfDay(item.completedAt)} 접속</span>
                          {duration && (
                            <>
                              <span aria-hidden>·</span>
                              <span>소요 {duration}</span>
                            </>
                          )}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
