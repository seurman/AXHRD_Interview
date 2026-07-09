"use client";

import { InterviewKitBuilder } from "@/components/org/InterviewKitBuilder";

type Props = {
  organizationId?: string;
  backHref?: string;
  backLabel?: string;
};

/**
 * 기관(고객사) 면접 킷 조립 — 플랫폼 뱅크에서 역량·문항을 골라 킷을 구성합니다.
 * (예전 문항 뱅크에 있던 Kit Studio 3단계 흐름과 동일한 역할)
 */
export function OrgKitStudioEditor({
  organizationId,
  backHref = "/org/settings",
  backLabel = "면접 설정으로",
}: Props) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-card-border bg-[linear-gradient(120deg,#0f172a_0%,#1e293b_55%,#0f172a_100%)] p-4 text-white sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Org kit studio</p>
        <p className="mt-1 text-sm text-white/70">
          ① 역량 선택 → ② 문항 매핑 → ③ 루브릭 조정. 플랫폼 문항 뱅크 메타데이터 편집은 관리자 문항
          뱅크 CMS에서 합니다.
        </p>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs">
          {["역량 선택", "문항 매핑", "루브릭"].map((label, i) => (
            <li
              key={label}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5"
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </div>
      <InterviewKitBuilder
        organizationId={organizationId}
        backHref={backHref}
        backLabel={backLabel}
      />
    </div>
  );
}
