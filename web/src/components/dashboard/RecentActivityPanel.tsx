import Link from "next/link";
import { ArrowRight, FileText, Mic2, Sparkles } from "lucide-react";

export type ActivityItem = {
  id: string;
  kind: "interview" | "discover" | "resume";
  title: string;
  subtitle: string;
  href: string;
  completedAt: string;
};

function kindIcon(kind: ActivityItem["kind"]) {
  if (kind === "interview") return Mic2;
  if (kind === "discover") return Sparkles;
  return FileText;
}

export function RecentActivityPanel({ items }: { items: ActivityItem[] }) {
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

  return (
    <section id="activity" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Continue</p>
          <h2 className="text-lg font-bold text-foreground">내 활동</h2>
          <p className="mt-1 text-sm text-muted">최근 완료 세션 · 리포트 바로가기</p>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = kindIcon(item.kind);
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
                  <span className="block font-medium text-foreground group-hover:text-gold">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{item.subtitle}</span>
                  <span className="mt-1 block text-[11px] text-muted/80">
                    {new Date(item.completedAt).toLocaleDateString("ko-KR")}
                  </span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
