import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

interface Crumb {
  label: string;
  href?: string;
}

interface QuickLink {
  href: string;
  label: string;
}

interface AdminPageHeaderProps {
  /** 상단 소분류 라벨. 예: "Tenants", "Superadmin". 비워두면 표시하지 않음. */
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  /** 헤더 우측에 붙는 버튼류(예: 생성 버튼). */
  actions?: ReactNode;
  /** 헤더 하단에 붙는 보조 내비게이션 링크 목록(예: "감사 로그 →"). */
  links?: QuickLink[];
  /** 상세/허브 페이지용 — breadcrumb이 없을 때만 사용. */
  backHref?: string;
  backLabel?: string;
  /** 상세/허브 페이지용 breadcrumb. 지정하면 backHref보다 우선한다. */
  breadcrumb?: Crumb[];
  className?: string;
}

/**
 * 모든 /admin/** 페이지가 공유하는 헤더 프리미티브.
 * eyebrow/h1/subtitle 크기·여백을 한 곳에서 고정해서, 페이지마다 다르게
 * 하드코딩되던 문제(text-xl vs text-2xl, mt-1 vs mt-2 vs mt-3 등)를 없앤다.
 * 플랫폼 콘솔 셸(platform-* 토큰)과 같은 타이포 스케일을 사용한다 —
 * `/admin` 홈(PlatformHomeDashboard)의 h1과 동일하게 맞춤.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  links,
  backHref,
  backLabel,
  breadcrumb,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--platform-text-muted)]">
          {breadcrumb.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="opacity-50">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[var(--platform-text)] hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--platform-text)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--platform-accent)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel ?? "목록으로"}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--platform-text-muted)]">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight text-[var(--platform-text)]",
              eyebrow ? "mt-1" : ""
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--platform-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[var(--platform-accent)] hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
