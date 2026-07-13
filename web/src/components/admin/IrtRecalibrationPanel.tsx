"use client";

import { useState } from "react";
import type { RecalibrationItemResult } from "@/lib/admin/irt-recalibration";

type Props = {
  readOnly?: boolean;
};

export function IrtRecalibrationPanel({ readOnly = false }: Props) {
  const [results, setResults] = useState<RecalibrationItemResult[] | null>(null);
  const [applied, setApplied] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [busy, setBusy] = useState<"dry" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(apply: boolean) {
    setBusy(apply ? "apply" : "dry");
    setError(null);
    try {
      const res = await fetch("/api/admin/irt/recalibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "재보정 요청 실패");
      setResults(body.results as RecalibrationItemResult[]);
      setApplied(!!body.applied);
      setAppliedCount(body.appliedCount ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "재보정 요청 실패");
    } finally {
      setBusy(null);
    }
  }

  const eligible = results?.filter((r) => !r.skipped).length ?? 0;
  const skipped = results?.filter((r) => r.skipped).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={readOnly || busy !== null}
          onClick={() => void run(false)}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy === "dry" ? "계산 중…" : "드라이런 (미리보기)"}
        </button>
        <button
          type="button"
          disabled={readOnly || busy !== null || !results || results.length === 0}
          onClick={() => {
            if (
              !confirm(
                `표본 충분한 ${eligible}개 문항의 difficulty/discrimination을 갱신합니다. 계속할까요?`,
              )
            ) {
              return;
            }
            void run(true);
          }}
          className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy === "apply" ? "적용 중…" : "검토 후 적용"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {applied && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800">
          {appliedCount}개 문항에 IRT 파라미터가 반영되었습니다.{" "}
          <a href="/admin/audit" className="font-medium underline">
            감사 로그
          </a>
          에서 변경 내역을 확인하세요.
        </p>
      )}

      {results && (
        <div className="card-luxe overflow-hidden">
          <div className="border-b border-card-border px-4 py-3 text-sm text-muted">
            재보정 대상 {eligible}건 · 표본 부족 {skipped}건 (드라이런은 DB를 변경하지 않습니다)
          </div>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="sticky top-0 bg-card text-xs text-muted">
                <tr className="border-b border-card-border">
                  <th className="px-3 py-2 font-medium">문항</th>
                  <th className="px-3 py-2 font-medium">역량</th>
                  <th className="px-3 py-2 font-medium">n</th>
                  <th className="px-3 py-2 font-medium">평균 점수</th>
                  <th className="px-3 py-2 font-medium">b (난이도)</th>
                  <th className="px-3 py-2 font-medium">a (변별도)</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr
                    key={row.questionId}
                    className={`border-b border-card-border last:border-0 ${
                      row.skipped ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{row.externalId}</td>
                    <td className="px-3 py-2 text-xs text-muted">{row.competencyCode}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.sampleSize}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {Math.round(row.avgRubricScore * 100)}%
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.oldDifficulty.toFixed(2)} → {row.newDifficulty.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.oldDiscrimination.toFixed(2)} → {row.newDiscrimination.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.skipped ? (
                        <span className="text-muted">{row.skipReason}</span>
                      ) : (
                        <span className="text-emerald-700">재보정</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
