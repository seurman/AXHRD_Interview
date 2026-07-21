"use client";

import type { ReactNode } from "react";

/** 레슨 bodyMd용 가벼운 마크다운 (제목·굵게·문단) */
export function LessonMarkdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n\n+/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines[0]?.startsWith("## ")) {
          return (
            <h3 key={i} className="text-base font-bold text-foreground">
              {inlineFormat(lines[0].slice(3))}
            </h3>
          );
        }
        return (
          <p key={i} className="text-muted">
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 ? <br /> : null}
                {inlineFormat(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inlineFormat(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
