"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { competencyLabel } from "@/lib/labels";

export function SwipePageHeader({
  focusCompetency,
}: {
  focusCompetency?: string | null;
}) {
  const { dict } = useI18n();
  const s = dict.swipe;

  return (
    <header className="mb-8 text-center">
      <p className="section-eyebrow">{s.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold text-foreground">{s.title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{s.subtitle}</p>
      {focusCompetency ? (
        <p className="mt-2 text-xs font-medium text-accent">
          집중 역량: {competencyLabel(focusCompetency)}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        <Link href="/practice/path" className="text-accent hover:underline">
          역량 학습 패스
        </Link>
        에서 개념·원리를 먼저 익힐 수 있어요
      </p>
    </header>
  );
}
