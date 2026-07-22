"use client";

import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

type Props = {
  ids: string[];
  onReorder: (next: string[]) => void;
  renderItem: (id: string, index: number) => React.ReactNode;
};

/** framer-motion Reorder — AX 인터뷰 킷 세로 드래그 정렬 */
export function MotionReorderList({ ids, onReorder, renderItem }: Props) {
  if (ids.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
        왼쪽에서 문항을 선택하면 여기에 표시됩니다.
      </p>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={ids}
      onReorder={onReorder}
      className="flex list-none flex-col gap-2 p-0"
    >
      {ids.map((id, index) => (
        <Reorder.Item
          key={id}
          value={id}
          className="flex cursor-grab items-start gap-2 rounded-xl border border-card-border bg-background p-3 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          whileDrag={{
            scale: 1.02,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 10,
          }}
        >
          <GripVertical
            className="mt-0.5 h-4 w-4 shrink-0 text-muted"
            aria-hidden
          />
          <div className="min-w-0 flex-1">{renderItem(id, index)}</div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
