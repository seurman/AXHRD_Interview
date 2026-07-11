"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { BankCompetencyRow } from "@/lib/competency/content-bank-data";
import { competencyLabel } from "@/lib/labels";

const CORE_NCS = [
  "COMMUNICATION",
  "PROBLEM_SOLVING",
  "JOB_FIT",
  "ORG_FIT",
  "LEADERSHIP",
  "GROWTH",
] as const;

const EXTENDED_NCS = [
  "NCS_NUMERACY",
  "NCS_INFORMATION",
  "NCS_TECHNOLOGY",
  "NCS_RESOURCE",
] as const;

type Props = {
  competencies: BankCompetencyRow[];
  onSynced?: () => void;
};

export function NcsCompetencyBankPanel({ competencies, onSynced }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ncsRows = competencies.filter((c) => c.source === "NCS" || CORE_NCS.includes(c.code as (typeof CORE_NCS)[number]) || EXTENDED_NCS.includes(c.code as (typeof EXTENDED_NCS)[number]));

  const runSync = useCallback(async () => {
    if (!confirm("seed/questions.json + ncs-extended.json + ncs-rubrics.json 정본을 플랫폼 뱅크에 동기화합니다. 계속할까요?")) {
      return;
    }
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/ncs-sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "동기화 실패");
      setMessage(json.message ?? "동기화 완료");
      onSynced?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "동기화 실패");
    } finally {
      setSyncing(false);
    }
  }, [onSynced]);

  function rowFor(code: string) {
    return ncsRows.find((c) => c.code === code);
  }

  return (
    <div className="space-y-6">
      <div className="card-luxe flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">NCS 직업기초능력 뱅크</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            국가직무능력표준(NCS) 기반 역량·문항·L1~5 루브릭입니다. 면접 IRT 핵심 6역량 + 공식 10영역 중
            독립 확장 4역량(수리·정보·기술·자원관리)을 포함합니다. 정본:{" "}
            <code className="text-xs">seed/questions.json</code>,{" "}
            <code className="text-xs">seed/ncs-extended.json</code>,{" "}
            <code className="text-xs">seed/ncs-rubrics.json</code>
          </p>
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void runSync()}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {syncing ? (
            <>
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
              동기화 중…
            </>
          ) : (
            "NCS 뱅크 동기화"
          )}
        </button>
      </div>

      {message && <p className="text-sm text-accent">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <section className="card-luxe p-5">
        <h3 className="text-sm font-semibold text-foreground">IRT 면접 핵심 6역량</h3>
        <p className="mt-1 text-xs text-muted">모의면접 역량 선택·IRT 엔진 기본 축</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_NCS.map((code) => {
            const row = rowFor(code);
            return (
              <li key={code} className="rounded-xl border border-card-border px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{competencyLabel(code)}</p>
                <p className="text-xs text-muted">{code}</p>
                <p className="mt-1 text-xs">
                  {row ? (
                    <>
                      문항 {row.questionCount} · {row.lifecycleStatus}
                    </>
                  ) : (
                    <span className="text-amber-700">미동기화 — 「NCS 뱅크 동기화」 실행</span>
                  )}
                </p>
                {row && (
                  <Link
                    href={`/admin/content?competency=${code}`}
                    className="mt-1 inline-block text-xs text-accent hover:underline"
                  >
                    Framework Studio에서 편집 →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card-luxe p-5">
        <h3 className="text-sm font-semibold text-foreground">NCS 10영역 확장 4역량</h3>
        <p className="mt-1 text-xs text-muted">
          JOB_FIT·PROBLEM_SOLVING 등에 통합돼 있던 영역을 독립 역량으로 분리 — 킷·콘텐츠 뱅크용
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {EXTENDED_NCS.map((code) => {
            const row = rowFor(code);
            return (
              <li key={code} className="rounded-xl border border-card-border px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{competencyLabel(code)}</p>
                <p className="text-xs text-muted">{code}</p>
                <p className="mt-1 text-xs">
                  {row ? `문항 ${row.questionCount} · ${row.lifecycleStatus}` : "미동기화"}
                </p>
                {row && (
                  <Link
                    href={`/admin/content?competency=${code}`}
                    className="mt-1 inline-block text-xs text-accent hover:underline"
                  >
                    편집 →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-muted">
        글로벌 20역량은 「글로벌 사전 (원본)」 탭에서 관리합니다. NCS와 Global은 Meaning Layer에서
        MAPS_TO로 연결되며 합치지 않습니다.
      </p>
    </div>
  );
}
