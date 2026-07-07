"use client";

import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

const ITEM_HEIGHT = 76;

type Props = {
  ids: string[];
  onReorder: (next: string[]) => void;
  renderItem: (id: string, index: number) => React.ReactNode;
};

/** framer-motion drag + layout — v11에는 Reorder export가 없어 동일 UX로 구현 */
export function MotionReorderList({ ids, onReorder, renderItem }: Props) {
  function moveItem(fromIndex: number, offsetY: number) {
    const delta = Math.round(offsetY / ITEM_HEIGHT);
    if (delta === 0) return;
    const toIndex = Math.max(0, Math.min(ids.length - 1, fromIndex + delta));
    if (toIndex === fromIndex) return;
    const next = [...ids];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    onReorder(next);
  }

  if (ids.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-card-border p-6 text-center text-sm text-muted">
        왼쪽에서 문항을 선택하면 여기에 표시됩니다.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {ids.map((id, index) => (
        <motion.li
          key={id}
          layout
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => moveItem(index, info.offset.y)}
          className="flex cursor-grab items-start gap-2 rounded-xl border border-card-border bg-background p-3 active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0 flex-1">{renderItem(id, index)}</div>
        </motion.li>
      ))}
    </ul>
  );
}
