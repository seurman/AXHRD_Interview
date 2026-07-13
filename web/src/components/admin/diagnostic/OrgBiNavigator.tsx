"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  orgBreadcrumbPath,
  orgLevelLabel,
  type OrgNode,
  type OrgTreeIndex,
} from "@/lib/diagnostic/org-analysis";

function OrgTreeNode({
  node,
  depth,
  drillId,
  tree,
  expanded,
  onToggle,
  onSelect,
}: {
  node: OrgNode;
  depth: number;
  drillId: string | null;
  tree: OrgTreeIndex;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const kids = tree.childrenOf.get(node.teamId) ?? [];
  const isOpen = expanded.has(node.teamId);
  const isActive = drillId === node.teamId;
  const hasKids = kids.length > 0;

  return (
    <li>
      <div
        className={`flex items-center gap-0.5 rounded-md pr-1 ${isActive ? "bg-gold/15 ring-1 ring-gold/30" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasKids ? (
          <button
            type="button"
            className="shrink-0 rounded p-1 text-muted hover:text-foreground"
            onClick={() => onToggle(node.teamId)}
            aria-label={isOpen ? "접기" : "펼치기"}
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          className={`min-w-0 flex-1 py-1.5 text-left text-xs ${node.hidden ? "text-muted" : "text-foreground"}`}
          onClick={() => onSelect(node.teamId)}
        >
          <span className="block truncate font-medium">{node.teamName}</span>
          <span className="text-[10px] text-muted">
            {orgLevelLabel(node.level)}
            {!node.hidden && node.OHI != null ? ` · OHI ${node.OHI.toFixed(2)}` : node.hidden ? " · 표본부족" : ""}
          </span>
        </button>
      </div>
      {hasKids && isOpen && (
        <ul className="mt-0.5 space-y-0.5">
          {kids.map((child) => (
            <OrgTreeNode
              key={child.teamId}
              node={child}
              depth={depth + 1}
              drillId={drillId}
              tree={tree}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgBiNavigator({
  drillId,
  tree,
  rootNodes,
  onSelect,
  onSelectRoot,
}: {
  drillId: string | null;
  tree: OrgTreeIndex;
  rootNodes: OrgNode[];
  onSelect: (id: string) => void;
  onSelectRoot: () => void;
}) {
  const pathIds = useMemo(() => {
    const path = orgBreadcrumbPath(drillId, tree.byId);
    return new Set(path.map((n) => n.teamId));
  }, [drillId, tree.byId]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(pathIds));

  useEffect(() => {
    setExpanded((prev) => new Set([...prev, ...pathIds]));
  }, [drillId, tree.byId]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string) => {
    setExpanded((prev) => new Set([...prev, id]));
    onSelect(id);
  };

  return (
    <nav className="card-luxe print-hide flex max-h-[min(70vh,640px)] flex-col overflow-hidden">
      <div className="border-b border-black/5 px-3 py-2.5 dark:border-white/10">
        <p className="text-xs font-semibold text-foreground">조직 계층</p>
        <p className="text-[10px] text-muted">클릭하여 드릴다운</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <button
          type="button"
          className={`mb-2 w-full rounded-md px-2 py-2 text-left text-xs font-medium ${drillId === null ? "bg-gold/15 ring-1 ring-gold/30" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"}`}
          onClick={onSelectRoot}
        >
          전사 종합
        </button>
        <ul className="space-y-0.5">
          {rootNodes.map((node) => (
            <OrgTreeNode
              key={node.teamId}
              node={node}
              depth={0}
              drillId={drillId}
              tree={tree}
              expanded={expanded}
              onToggle={toggle}
              onSelect={handleSelect}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
}
