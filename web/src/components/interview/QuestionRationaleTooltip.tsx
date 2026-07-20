"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function QuestionRationaleTooltip({ rationale }: { rationale: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-semibold text-gold transition-colors hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
          >
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            질문 근거
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          sideOffset={8}
          hideArrow
          className="block w-72 max-w-[min(18rem,calc(100vw-2rem))] border border-gold/30 bg-card p-3 text-left text-xs leading-relaxed text-muted shadow-luxe"
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
            AI 질문 설계 근거
          </p>
          {rationale}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
