"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader } from "@/components/ui/icons";
import { LoadingRitual } from "@/components/ux/LoadingRitual";
import { competencyLabel, jobRoleLabel } from "@/lib/labels";
import { JOB_ROLES } from "@/types";
import type { PublicKitShare } from "@/lib/org/kit-share";
import {
  DEFAULT_TIME_BUDGET_MINUTES,
  TIME_BUDGET_MINUTES_OPTIONS,
  questionsPerCompetencyForRound,
  type TimeBudgetMinutes,
} from "@/lib/interview/session-limits";
import { trackFunnel } from "@/lib/analytics/funnel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  slug: string;
  initialShare: PublicKitShare;
};

export function KitStartClient({ slug, initialShare }: Props) {
  const router = useRouter();
  const [jobRole, setJobRole] = useState<string>("MARKETING");
  const [focusCompetency, setFocusCompetency] = useState<string>(
    initialShare.competencies[0]?.code ?? ""
  );
  const [timeBudgetMinutes, setTimeBudgetMinutes] =
    useState<TimeBudgetMinutes>(DEFAULT_TIME_BUDGET_MINUTES);
  const [resumeText, setResumeText] = useState("");
  const [showResume, setShowResume] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!focusCompetency) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kit/${slug}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: initialShare.organizationName,
          jobRole,
          focusCompetency,
          timeBudgetMinutes,
          resumeText: resumeText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setLoading(false);
        router.push(`/auth/login?next=${encodeURIComponent(`/kit/${slug}`)}`);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "면접을 시작하지 못했습니다.");
      }
      trackFunnel("interview_setup_done", {
        source: "kit",
        competency: focusCompetency,
        timeBudgetMinutes,
        hasResume: resumeText.trim().length > 0,
      });
      router.push(`/interview/${data.sessionId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "면접을 시작하지 못했습니다.";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const qCount = questionsPerCompetencyForRound(timeBudgetMinutes, 1);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          {initialShare.organizationName} · {initialShare.label}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          이 기관이 구성한 면접으로 연습하기
        </h1>
        <p className="mt-2 text-sm text-muted">
          AXHRD 인터뷰 계정으로 로그인하면 바로 시작할 수 있습니다. 기관에 별도로
          가입할 필요는 없습니다.
        </p>
        <p className="mt-3 rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-foreground">
          이 모의면접 결과는 <strong>{initialShare.organizationName}</strong> 채용 담당자에게
          전달됩니다.
        </p>
      </div>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">직무</h2>
        <Select value={jobRole} onValueChange={setJobRole} disabled={loading}>
          <SelectTrigger className="input-luxe h-auto w-full py-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {jobRoleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">역량</h2>
        {initialShare.competencies.length === 0 ? (
          <p className="text-sm text-danger">
            이 링크에 설정된 역량이 없습니다. 기관 담당자에게 문의해 주세요.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {initialShare.competencies.map((c) => (
              <button
                key={c.code}
                type="button"
                disabled={loading}
                onClick={() => setFocusCompetency(c.code)}
                className={`rounded-xl border p-3 text-left text-sm transition disabled:opacity-60 ${
                  focusCompetency === c.code
                    ? "border-gold bg-gold/10 text-foreground ring-1 ring-gold/30"
                    : "border-card-border text-foreground hover:border-gold/40"
                }`}
              >
                <span className="font-medium">{c.nameKo || competencyLabel(c.code)}</span>
                {c.description && (
                  <span className="mt-1 block text-xs opacity-70">{c.description}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card-luxe space-y-3 p-6">
        <h2 className="font-semibold text-foreground">면접 시간</h2>
        <p className="text-xs text-muted">설정 화면과 동일하게 문항 수가 배분됩니다.</p>
        <div className="flex flex-wrap gap-2">
          {TIME_BUDGET_MINUTES_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={loading}
              onClick={() => setTimeBudgetMinutes(n)}
              className={`min-w-[4.5rem] rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                timeBudgetMinutes === n
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/25"
                  : "border-card-border text-foreground hover:border-primary/30"
              }`}
            >
              {n}
              <span className="ml-1 text-xs font-normal opacity-70">분</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">약 {timeBudgetMinutes}분 · {qCount}문항</p>
      </section>

      <section className="card-luxe space-y-3 p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-foreground">자기소개서 (선택)</h2>
          <button
            type="button"
            className="text-xs text-muted underline hover:text-foreground"
            onClick={() => setShowResume((v) => !v)}
          >
            {showResume ? "접기" : "텍스트 입력"}
          </button>
        </div>
        <p className="text-xs text-muted">
          넣으면 첫 질문에 내용이 반영됩니다. 없어도 일반 질문으로 진행합니다.
        </p>
        {showResume ? (
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={5}
            disabled={loading}
            placeholder="자기소개서 내용을 붙여넣으세요…"
            className="input-luxe w-full text-sm"
          />
        ) : null}
      </section>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void start()}
        disabled={loading || !focusCompetency}
        className="btn-primary w-full py-3.5"
      >
        {loading ? (
          <>
            <IconLoader /> 준비 중…
          </>
        ) : (
          "면접 시작하기"
        )}
      </button>

      {loading && (
        <div className="card-luxe border-t-[3px] border-t-gold/40 px-3">
          <LoadingRitual variant="setup" competencyCode={focusCompetency} compact />
        </div>
      )}
    </div>
  );
}
