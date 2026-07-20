import type { ReactNode } from "react";

/** 면접 설정 섹션 — 스텝 번호 + 금색 상단 라인 */
export function SetupSection({
  step,
  eyebrow,
  title,
  hint,
  children,
}: {
  step: number;
  eyebrow?: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="setup-section">
      <div className="setup-section__head">
        <span className="badge-step" aria-hidden>
          {step}
        </span>
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
          <h2 className="setup-section__title">{title}</h2>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
        </div>
      </div>
      <div className="setup-section__body">{children}</div>
    </section>
  );
}
