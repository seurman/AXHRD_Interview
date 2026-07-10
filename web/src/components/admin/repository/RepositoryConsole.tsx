"use client";

import { useState } from "react";
import Link from "next/link";
import type { RepositoryCompetencyRow } from "@/lib/repository/types";
import { CompetencyMasterBoard } from "@/components/admin/repository/CompetencyMasterBoard";
import { CompetencyWorkspace } from "@/components/admin/repository/CompetencyWorkspace";

export function RepositoryConsole() {
  const [selected, setSelected] = useState<RepositoryCompetencyRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Platform · Content</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">역량 뱅크</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          플랫폼 마스터 역량의 라이프사이클, 테넌트 루브릭 세트, 질문-채점 연결을 관리합니다.
          IRT 문항·난이도·문항별 rubricCriteria 편집은{" "}
          <Link href="/admin/content" className="font-medium text-accent hover:underline">
            문항 뱅크
          </Link>
          에서, 역량 L-루브릭(rubricByLevel) 편집도 동일 CMS에서 할 수 있습니다.
        </p>
      </header>

      <div className="grid min-h-[640px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <CompetencyMasterBoard
          selectedId={selected?.id ?? null}
          refreshKey={refreshKey}
          onSelect={setSelected}
        />
        <div className="min-w-0">
          {selected ? (
            <CompetencyWorkspace
              key={selected.id}
              competency={selected}
              onRefreshList={() => setRefreshKey((k) => k + 1)}
            />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 text-center">
              <p className="text-base font-medium text-foreground">역량을 선택하세요</p>
              <p className="mt-2 max-w-sm text-sm text-muted">
                좌측 목록에서 역량을 고르면 기존 L-루브릭·문항별 채점 기준·RubricSet 매핑 상태를
                한눈에 확인할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
