"use client";

import type { DraftTeamInput } from "@/lib/diagnostic/hierarchy-tree";

type Props = {
  divisionName: string;
  unitName: string;
  teamName: string;
  pasteInput: string;
  busy?: boolean;
  onDivisionChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  onTeamChange: (v: string) => void;
  onPasteChange: (v: string) => void;
  onAddOne: () => void;
  onAddPaste: () => void;
  addOneLabel?: string;
  addPasteLabel?: string;
};

/** 사업본부 → 사업부 → 팀 한 줄 추가 + 여러 줄 붙여넣기 */
export function HierarchyTeamFields({
  divisionName,
  unitName,
  teamName,
  pasteInput,
  busy = false,
  onDivisionChange,
  onUnitChange,
  onTeamChange,
  onPasteChange,
  onAddOne,
  onAddPaste,
  addOneLabel = "팀 추가",
  addPasteLabel = "붙여넣기 추가",
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border border-card-border bg-background/50 p-3">
        <p className="text-xs font-semibold text-foreground">한 줄 추가</p>
        <p className="text-[11px] text-muted">
          사업본부 → 사업부 → 팀. 상위는 선택, 팀명은 필수입니다. 응답 링크는 팀(리프)에만
          발급됩니다.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm"
            placeholder="사업본부 (선택)"
            value={divisionName}
            onChange={(e) => onDivisionChange(e.target.value)}
            disabled={busy}
          />
          <input
            className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm"
            placeholder="사업부 (선택)"
            value={unitName}
            onChange={(e) => onUnitChange(e.target.value)}
            disabled={busy}
          />
          <input
            className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm"
            placeholder="팀명 (필수)"
            value={teamName}
            onChange={(e) => onTeamChange(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddOne();
              }
            }}
          />
        </div>
        <button
          type="button"
          className="btn-secondary min-h-10 px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy}
          onClick={onAddOne}
        >
          {busy ? "추가 중…" : addOneLabel}
        </button>
      </div>

      <details className="rounded-xl border border-card-border bg-background/50 px-3 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">
          여러 줄 붙여넣기 (엑셀 복사)
        </summary>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          한 줄에 <code className="text-[10px]">사업본부,사업부,팀명</code>. 엑셀에서 복사해 넣을 수
          있습니다.
        </p>
        <textarea
          className="mt-2 min-h-[6rem] w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm"
          placeholder={"그로스본부,마케팅사업부,콘텐츠팀\n그로스본부,마케팅사업부,퍼포먼스팀\n오퍼레이션본부,운영사업부,CS팀"}
          value={pasteInput}
          onChange={(e) => onPasteChange(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          className="btn-secondary mt-2 min-h-10 px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy}
          onClick={onAddPaste}
        >
          {busy ? "추가 중…" : addPasteLabel}
        </button>
      </details>
    </div>
  );
}

export function draftFromFields(
  divisionName: string,
  unitName: string,
  teamName: string,
): DraftTeamInput | null {
  const name = teamName.trim();
  if (!name) return null;
  return {
    name,
    divisionName: divisionName.trim() || undefined,
    unitName: unitName.trim() || undefined,
  };
}
