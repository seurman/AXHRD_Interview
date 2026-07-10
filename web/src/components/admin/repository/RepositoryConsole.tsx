"use client";

import { useState } from "react";
import Link from "next/link";
import type { RepositoryCompetencyRow } from "@/lib/repository/types";
import { CompetencyMasterBoard } from "@/components/admin/repository/CompetencyMasterBoard";
import { RubricQuestionMapper } from "@/components/admin/repository/RubricQuestionMapper";

export function RepositoryConsole() {
  const [selected, setSelected] = useState<RepositoryCompetencyRow | null>(null);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Super Admin</p>
        <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
          역량 리포지토리 · 루브릭 · 질문 매핑
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
          플랫폼 마스터 역량의 라이프사이클(DRAFT → ACTIVE)을 관리하고, 테넌트별 루브릭 세트와
          질문-루브릭 매핑을 한 화면에서 검증합니다. IRT 문항 편집·클러스터 관리는{" "}
          <Link href="/admin/content" className="text-accent hover:underline">
            통합 문항 뱅크 CMS
          </Link>
          에서 계속할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <CompetencyMasterBoard
          selectedId={selected?.id ?? null}
          onSelect={(c) => setSelected(c)}
        />
        <RubricQuestionMapper competency={selected} />
      </div>
    </div>
  );
}
