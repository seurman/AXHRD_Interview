import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import type { ContentHomeSnapshot } from "@/lib/admin/platform-home-data";
import { ClipboardList, Layers, Presentation } from "lucide-react";

type Props = {
  snapshot: ContentHomeSnapshot;
  links: Array<{ href: string; label: string; desc: string }>;
};

export function ContentHomeDashboard({ snapshot, links }: Props) {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title="콘텐츠 운영"
        subtitle="문항·역량·데모 샌드박스를 관리합니다. 테넌트·결제 메뉴는 권한에 따라 사이드바에만 표시됩니다."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "플랫폼 역량", value: snapshot.platformCompetencies },
          { label: "플랫폼 문항", value: snapshot.platformQuestions },
          { label: "기관 커스텀 역량", value: snapshot.orgCustomCompetencies },
          { label: "데모 워크스페이스", value: snapshot.demoWorkspaces },
        ].map((s) => (
          <div key={s.label} className="platform-metric-tile">
            <p className="text-xs font-semibold text-[var(--platform-text-muted)]">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--platform-text)]">{s.value}</p>
          </div>
        ))}
      </section>

      <AdminSection title="콘텐츠 모듈" description="권한이 있는 화면만 표시됩니다.">
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="flex items-start gap-3 rounded-lg border border-[var(--platform-border)] p-4 transition hover:border-[var(--platform-accent)]/40"
            >
              {mod.href.includes("repository") ? (
                <Layers className="mt-0.5 h-4 w-4 text-gold" />
              ) : mod.href.includes("demo") ? (
                <Presentation className="mt-0.5 h-4 w-4 text-gold" />
              ) : (
                <ClipboardList className="mt-0.5 h-4 w-4 text-gold" />
              )}
              <div>
                <p className="font-medium text-foreground">{mod.label}</p>
                <p className="text-sm text-muted">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
