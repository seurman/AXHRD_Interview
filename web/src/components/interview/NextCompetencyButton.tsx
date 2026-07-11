"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader } from "@/components/ui/icons";
import { competencyLabel } from "@/lib/labels";

interface NextCompetencyButtonProps {
  planId: string;
  /** 이어서 진행할 역량 코드들 — queue[0]이 다음에 시작할 역량 */
  queue: string[];
  industry?: string;
  companySize?: string;
  companyName?: string;
  jobRole?: string;
  resumeText?: string;
  resumeFileName?: string;
}

/**
 * 설정 화면에서 역량을 여러 개 골랐을 때, 방금 끝난 세션의 리포트 화면에서
 * 곧바로 다음 역량 세션을 시작하는 버튼. 설정 화면을 다시 거치지 않고
 * (industry/jobRole/resume를 다시 입력할 필요 없이) 방금 세션에 쓰인 맥락을
 * 그대로 재사용해 /api/interview/start를 다시 호출한다. 큐는 DB에 저장하지
 * 않고 URL로만 들고 다니므로, 이 버튼이 마이그레이션 없이도 동작한다.
 */
export function NextCompetencyButton({
  planId,
  queue,
  industry,
  companySize,
  companyName,
  jobRole,
  resumeText,
  resumeFileName,
}: NextCompetencyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = queue[0];
  const rest = queue.slice(1);

  if (!next) return null;

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          focusCompetency: next,
          industry,
          companySize,
          companyName,
          jobRole,
          resumeText,
          resumeFileName,
          queuedCompetencies: rest,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "다음 역량 면접을 시작하지 못했습니다.");
      const qs = rest.length > 0 ? `?queue=${encodeURIComponent(rest.join(","))}` : "";
      router.push(`/interview/${data.sessionId}${qs}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다음 역량 면접을 시작하지 못했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="print-hide space-y-2">
      <button type="button" onClick={start} disabled={loading} className="btn-primary">
        {loading ? (
          <>
            <IconLoader /> 준비 중…
          </>
        ) : (
          <>다음 역량: {competencyLabel(next)} 이어서 시작 →</>
        )}
      </button>
      {rest.length > 0 && (
        <p className="text-xs text-muted">이후 {rest.length}개 역량도 이어서 추천해 드려요.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
