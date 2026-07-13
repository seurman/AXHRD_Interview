"use client";

import { FilePenLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconLoader, IconUpload } from "@/components/ui/icons";
import { LoadingRitual } from "@/components/ux/LoadingRitual";
import { jobRoleLabel, competencyLabel, industryLabel } from "@/lib/labels";
import { COMPETENCY_CODES, INDUSTRY_CODES, COMPANY_SIZE_CODES } from "@/types";
import type { IndustryCode, JobRoleCode, CompanySizeCode } from "@/types";
import { matchPersona } from "@/lib/interview/persona-archetype";
import type { JDMapResult } from "@/lib/company/jd-mapper";
import type { EnrichedJdMapResult } from "@/lib/company/jd-enrichment";
import { suggestCompetencySet } from "@/lib/meaning/suggest-competency-set";
import type { PrepMode } from "@/lib/interview/competency-round";
import {
  DEFAULT_TIME_BUDGET_MINUTES,
  TIME_BUDGET_MINUTES_OPTIONS,
  questionsPerCompetencyForRound,
} from "@/lib/interview/session-limits";
import { useI18n } from "@/lib/i18n/I18nProvider";

const JOB_ROLES = [
  "MARKETING",
  "DEVELOPMENT",
  "BUSINESS_SUPPORT",
  "SALES",
  "DESIGN",
  "HR",
  "FINANCE",
  "OTHER",
] as const;

const ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

const JD_ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg,image/webp,image/gif";

type CompetencyRow = {
  code: string;
  label: string;
  status: string;
  levelEst?: number;
  percentile?: number;
};

function ReflectChip({
  label,
  editLabel,
  removeLabel,
  onEdit,
  onRemove,
}: {
  label: string;
  editLabel: string;
  removeLabel: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5">
      <span className="text-sm text-success">✓ {label}</span>
      <button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">
        {editLabel}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-muted hover:text-foreground hover:underline"
      >
        {removeLabel}
      </button>
    </div>
  );
}

export function SetupForm({
  user,
  featureFlags = {
    resumeClaimVerification: true,
    jdBonusQuestion: true,
    tripleFeedbackMode: true,
  },
}: {
  user: { id: string; name: string; email: string };
  featureFlags?: {
    resumeClaimVerification: boolean;
    jdBonusQuestion: boolean;
    tripleFeedbackMode: boolean;
  };
}) {
  const { dict, locale } = useI18n();
  const s = dict.setup;

  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [industry, setIndustry] = useState<string>("");
  const [companySize, setCompanySize] = useState<CompanySizeCode>("MID");
  const [companyName, setCompanyName] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [jdFileError, setJdFileError] = useState<string | null>(null);
  const [jdSourceNote, setJdSourceNote] = useState<string | null>(null);
  const [parsingJdFile, setParsingJdFile] = useState(false);
  const [showJdEditor, setShowJdEditor] = useState(false);
  const [jdAnalysis, setJdAnalysis] = useState<JDMapResult | null>(null);
  const [jdAnalysisSource, setJdAnalysisSource] = useState("");
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [jdAnalysisNote, setJdAnalysisNote] = useState<string | null>(null);
  const [jdAnalysisError, setJdAnalysisError] = useState<string | null>(null);
  const [jobRole, setJobRole] = useState<string>("MARKETING");
  const [resumeText, setResumeText] = useState("");
  const [showResumeEditor, setShowResumeEditor] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // 여러 역량을 한 번에 추천/선택할 수 있도록 배열로 관리한다. 순서 = 진행 우선순위
  // (0번째가 이번에 시작할 역량). 세션 API 계약은 여전히 역량 1개(focusCompetency)만
  // 받으므로, 배열의 나머지는 이번 세션 완료 후 이어서 추천하는 용도로만 쓴다.
  const [focusCompetencies, setFocusCompetencies] = useState<string[]>([]);
  const focusCompetency = focusCompetencies[0] ?? "";
  const [tripleFeedbackMode, setTripleFeedbackMode] = useState(false);
  const [jdBonusEnabled, setJdBonusEnabled] = useState(false);
  const [resumeClaimEnabled, setResumeClaimEnabled] = useState(false);
  const [timeBudgetMinutes, setTimeBudgetMinutes] = useState(DEFAULT_TIME_BUDGET_MINUTES);
  const [prepMode, setPrepMode] = useState<PrepMode>("COMPETENCY_SET");
  // 역량 카드를 직접 클릭했는지 여부 — 산업/직무를 고를 때 자동으로 역량을 바꿔주되,
  // 사용자가 이미 직접 골랐다면(또는 URL의 ?competency=로 왔다면) 덮어쓰지 않기 위한 플래그.
  const competencyManuallyChanged = useRef(false);

  // 산업군+직무를 둘 다 고르면 곧바로 매칭되는 지원자 페르소나 — 채점과 무관, 재미 요소.
  // 순수 함수라 서버 호출 없이 즉시 계산된다(추후 /api/interview/start가 동일한
  // 값을 다시 계산해 TargetCompany.persona로 저장 — 항상 같은 조합이면 같은 결과).
  const persona = useMemo(() => {
    if (!industry) return null;
    return matchPersona(industry as IndustryCode, jobRole as JobRoleCode);
  }, [industry, jobRole]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [competencies, setCompetencies] = useState<CompetencyRow[]>(
    COMPETENCY_CODES.map((code) => ({
      code,
      label: competencyLabel(code),
      status: "NOT_STARTED",
    }))
  );
  const loadProgress = useCallback(
    async (pid?: string | null, skipAutoFocus = false) => {
      const qs = pid ? `?planId=${encodeURIComponent(pid)}` : "";
      const res = await fetch(`/api/candidates/progress${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.plan?.id) setPlanId(data.plan.id);
      if (data.competencies) {
        setCompetencies(data.competencies);
        if (!skipAutoFocus) {
          const next = data.competencies.find(
            (c: CompetencyRow) =>
              c.status === "IN_PROGRESS" || c.status === "NOT_STARTED"
          );
          if (next) setFocusCompetencies([next.code]);
        }
      }
    },
    []
  );

  useEffect(() => {
    const pid = searchParams.get("planId");
    const comp = searchParams.get("competency");
    if (pid) setPlanId(pid);
    if (comp) {
      setFocusCompetencies([comp]);
      competencyManuallyChanged.current = true;
    }
    loadProgress(pid, Boolean(comp));
  }, [searchParams, loadProgress]);

  useEffect(() => {
    if (companyName.trim() || jdText.trim()) {
      setPrepMode("COMPANY_TARGET");
    }
  }, [companyName, jdText]);

  useEffect(() => {
    if (!persona || competencyManuallyChanged.current) return;
    if (jdAnalysis) return;
    const recommended = suggestCompetencySet({
      prepMode,
      personaFocus: persona.focusCompetencies,
      meaningGraphScores: [],
      completedCompetencies: competencies
        .filter((c) => c.status === "COMPLETED")
        .map((c) => c.code),
    });
    if (recommended.length > 0) setFocusCompetencies(recommended);
  }, [persona, competencies, jdAnalysis, prepMode]);

  useEffect(() => {
    if (!jdAnalysis || competencyManuallyChanged.current) return;
    const enriched = jdAnalysis as EnrichedJdMapResult;
    const set =
      enriched.recommendedCompetencySet?.length
        ? enriched.recommendedCompetencySet
        : jdAnalysis.recommendedCompetency
          ? [jdAnalysis.recommendedCompetency]
          : [];
    const filtered = set.filter((code) => {
      const row = competencies.find((c) => c.code === code);
      return row && row.status !== "COMPLETED";
    });
    if (filtered.length > 0) setFocusCompetencies(filtered);
  }, [jdAnalysis, competencies]);

  useEffect(() => {
    if (companySize === "PUBLIC") setIndustry("PUBLIC");
  }, [companySize]);

  useEffect(() => {
    if (industry === "PUBLIC") setCompanySize("PUBLIC");
  }, [industry]);

  const handleIndustryChange = (code: string) => {
    setIndustry(code);
    if (code === "PUBLIC") setCompanySize("PUBLIC");
  };

  const handleCompanySizeChange = (size: CompanySizeCode) => {
    setCompanySize(size);
    if (size === "PUBLIC") setIndustry("PUBLIC");
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setParsingFile(true);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const isPlainText = ext === "txt" || ext === "md";

    try {
      let text = "";
      if (isPlainText) {
        text = (await file.text()).trim();
        if (!text) throw new Error("파일이 비어 있습니다.");
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "파일을 읽지 못했습니다.");
        text = typeof data.text === "string" ? data.text : "";
      }

      setResumeText(text);
      setUploadedFileName(file.name);
      setShowResumeEditor(false);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "파일 업로드 실패");
      setUploadedFileName(null);
      setResumeText("");
    } finally {
      setParsingFile(false);
    }
  };

  const clearResume = () => {
    setResumeText("");
    setUploadedFileName(null);
    setShowResumeEditor(false);
    setFileError(null);
  };

  const clearJd = () => {
    setJdText("");
    setJdFileName(null);
    setJdFileError(null);
    setJdSourceNote(null);
    setShowJdEditor(false);
    setJdAnalysis(null);
    setJdAnalysisSource("");
    setJdAnalysisNote(null);
    setJdAnalysisError(null);
  };

  const analyzeJdText = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 15) return;
    setAnalyzingJd(true);
    setJdAnalysisError(null);
    try {
      const res = await fetch("/api/jd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: trimmed,
          industryLabel: industry ? industryLabel(industry) : undefined,
          industryCode: industry || undefined,
          jobRole: jobRole || undefined,
        }),
      });
      const data = (await res.json()) as JDMapResult & {
        error?: string;
        recommendationSource?: "llm" | "meaning_graph" | "blended" | null;
      };
      if (!res.ok) throw new Error(data.error ?? "공고 분석에 실패했습니다.");
      setJdAnalysis(data);
      setJdAnalysisSource(trimmed);
      if (data.recommendedCompetency) {
        const sourceLabel =
          data.recommendationSource === "meaning_graph"
            ? "Meaning Layer 그래프"
            : data.recommendationSource === "blended"
              ? "AI + 그래프"
              : "공고 AI";
        setJdAnalysisNote(
          `📄 ${competencyLabel(data.recommendedCompetency)} 역량을 ${sourceLabel}로 추천했어요.${
            data.competencyRationale ? ` ${data.competencyRationale}` : ""
          }`,
        );
      } else {
        setJdAnalysisNote("📄 공고 분석이 완료됐어요. 원하는 역량을 직접 골라 주세요.");
      }
    } catch (e) {
      setJdAnalysis(null);
      setJdAnalysisSource("");
      setJdAnalysisNote(null);
      setJdAnalysisError(e instanceof Error ? e.message : "공고 분석에 실패했습니다.");
    } finally {
      setAnalyzingJd(false);
    }
  };

  const handleJdFile = async (file: File) => {
    setJdFileError(null);
    setJdSourceNote(null);
    setParsingJdFile(true);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const isPlainText = ext === "txt" || ext === "md";

    try {
      if (isPlainText) {
        const text = await file.text();
        if (!text.trim()) throw new Error("파일이 비어 있습니다.");
        setJdText(text.trim());
        setJdFileName(file.name);
        setShowJdEditor(false);
        if (text.trim().length >= 15) await analyzeJdText(text.trim());
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/jd/parse", { method: "POST", body: formData });
      const data = (await res.json()) as {
        text?: string;
        fileName?: string;
        error?: string;
        ocrUsed?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? "파일을 읽지 못했습니다.");
      const text = typeof data.text === "string" ? data.text : "";
      if (!text.trim()) throw new Error("파일에서 텍스트를 읽지 못했습니다.");
      setJdText(text);
      setJdFileName(data.fileName ?? file.name);
      setShowJdEditor(false);
      if (data.ocrUsed) {
        setJdSourceNote(s.jd.imageOcrSuccess);
      }
      if (text.trim().length >= 15) await analyzeJdText(text.trim());
    } catch (e) {
      setJdFileError(e instanceof Error ? e.message : "파일 업로드 실패");
      setJdFileName(null);
    } finally {
      setParsingJdFile(false);
    }
  };

  const startInterview = async () => {
    if (!industry) {
      alert(s.selectIndustry);
      return;
    }
    if (!focusCompetency) {
      alert(s.selectCompetency);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          companySize,
          companyName,
          jobRole,
          resumeText: resumeText.trim(),
          resumeFileName: uploadedFileName,
          planId,
          focusCompetency,
          // 이번 세션 이후 이어서 추천할 나머지 역량들 — 현재 API는 아직 안 읽지만,
          // 세션 완료 후 "다음 역량 이어가기" 흐름을 붙일 때 그대로 쓸 수 있도록
          // 미리 함께 보내둔다 (하위 호환: 몰라도 그냥 무시됨).
          queuedCompetencies: focusCompetencies.slice(1),
          jdText,
          tripleFeedbackMode,
          jdBonusEnabled: jdBonusEnabled && !!jdText.trim(),
          resumeClaimEnabled: resumeClaimEnabled && !!resumeText.trim(),
          timeBudgetMinutes,
          prepMode,
          precomputedJdAnalysis:
            jdAnalysis && jdDraft && jdAnalysisSource === jdDraft
              ? { ...jdAnalysis, sourceText: jdDraft }
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.allDone && data.planId) {
          router.push(`/interview/plan/${data.planId}`);
          return; // 다음 화면으로 이동 중 — 버튼 상태를 되돌리지 않는다
        }
        throw new Error(data.error ?? "Failed to start");
      }

      const rest = focusCompetencies.slice(1);
      const queueQs = rest.length > 0 ? `?queue=${encodeURIComponent(rest.join(","))}` : "";
      router.push(`/interview/${data.sessionId}${queueQs}`);
      // 성공 시에는 setLoading(false)를 호출하지 않는다.
      // router.push() 후에도 다음 페이지가 서버에서 렌더링을 마칠 때까지
      // 이 컴포넌트가 잠시 화면에 남아있는데, 여기서 loading을 풀면
      // "준비 중…" 버튼이 원래 상태로 돌아왔다가 화면이 넘어가는 것처럼
      // 깜빡이는 문제가 있었다. 실패했을 때만 버튼을 원상복구한다.
    } catch (e) {
      alert(e instanceof Error ? e.message : "면접 시작에 실패했습니다.");
      setLoading(false);
    }
  };

  const requestResumeReview = async () => {
    const trimmedResume = resumeText.trim();
    if (trimmedResume.length < 20) {
      alert(s.resumeReview.needResume);
      return;
    }
    if (!industry) {
      alert(s.selectIndustry);
      return;
    }

    setReviewLoading(true);
    try {
      const res = await fetch("/api/resume/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: trimmedResume,
          resumeFileName: uploadedFileName,
          industry,
          jobRole,
          jdText,
          companyName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "첨삭 생성 실패");
      }
      router.push(`/resume-review/${data.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "첨삭 생성에 실패했습니다.");
      setReviewLoading(false);
    }
  };

  const completedCount = competencies.filter((c) => c.status === "COMPLETED").length;
  const resumeDraft = resumeText.trim();
  const jdDraft = jdText.trim();
  const jdReflectLabel =
    jdSourceNote ??
    (jdFileName && jdDraft
      ? `${jdFileName} · ${s.jd.charsApplied.replace("{chars}", String(jdDraft.length))}`
      : jdDraft
        ? s.jd.charsApplied.replace("{chars}", String(jdDraft.length))
        : null);
  const resumeReflectLabel =
    resumeDraft.length > 0
      ? uploadedFileName
        ? `${uploadedFileName} · ${s.resume.charsApplied.replace("{chars}", String(resumeDraft.length))}`
        : s.resume.charsApplied.replace("{chars}", String(resumeDraft.length))
      : null;
  const canRequestReview =
    Boolean(industry) &&
    resumeDraft.length >= 20 &&
    !reviewLoading &&
    !loading &&
    !parsingFile;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{s.title}</h1>
        <p className="mt-2 text-muted">
          {locale === "ko" ? `${user.name}님 · ${s.subtitle}` : `${user.name} · ${s.subtitle}`}
        </p>
      </div>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{s.industry.title}</h2>
        <p className="text-xs leading-relaxed text-muted">{s.industry.hint}</p>
        <select
          value={industry}
          onChange={(e) => handleIndustryChange(e.target.value)}
          className="input-luxe w-full"
        >
          <option value="" disabled>
            {s.industry.placeholder}
          </option>
          {INDUSTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {industryLabel(code)}
            </option>
          ))}
        </select>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{s.companySize.title}</h3>
          <p className="text-xs leading-relaxed text-muted">{s.companySize.hint}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPANY_SIZE_CODES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleCompanySizeChange(size)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  companySize === size
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/25"
                    : "border-card-border text-foreground hover:border-primary/30"
                }`}
              >
                {s.companySizes[size]}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder={s.industry.companyPlaceholder}
          className="input-luxe w-full text-sm"
        />

        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted">{s.jd.hint}</p>
          <label
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-5 transition ${
              parsingJdFile
                ? "border-accent/50 bg-accent/5"
                : "border-card-border hover:border-gold/50 hover:bg-gold/5"
            }`}
          >
            {parsingJdFile ? (
              <>
                <IconLoader className="h-7 w-7 text-accent" />
                <span className="text-sm text-accent">{s.jd.parsing}</span>
              </>
            ) : (
              <>
                <IconUpload className="h-7 w-7 text-muted" />
                <span className="text-sm text-muted">{s.jd.upload}</span>
              </>
            )}
            <input
              type="file"
              accept={JD_ACCEPT}
              className="hidden"
              disabled={parsingJdFile}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleJdFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {jdAnalysisNote && (
            <p className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-foreground">
              {jdAnalysisNote}
            </p>
          )}
          {jdAnalysisError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {jdAnalysisError}
            </p>
          )}
          {jdFileError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {jdFileError}
            </p>
          )}

          {jdReflectLabel && !showJdEditor && (
            <ReflectChip
              label={jdReflectLabel}
              editLabel={s.jd.viewEdit}
              removeLabel={s.jd.remove}
              onEdit={() => setShowJdEditor(true)}
              onRemove={clearJd}
            />
          )}

          {showJdEditor ? (
            <div className="space-y-2">
              <textarea
                value={jdText}
                onChange={(e) => {
                  setJdText(e.target.value);
                  if (jdAnalysisSource && e.target.value.trim() !== jdAnalysisSource) {
                    setJdAnalysis(null);
                    setJdAnalysisSource("");
                    setJdAnalysisNote(null);
                  }
                }}
                rows={5}
                placeholder={s.jd.placeholder}
                className="input-luxe w-full text-sm"
              />
              {jdDraft.length >= 80 && (
                <button
                  type="button"
                  onClick={() => void analyzeJdText(jdDraft)}
                  disabled={analyzingJd}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {analyzingJd ? "공고 분석 중…" : "AI로 필요역량 분석"}
                </button>
              )}
              {jdReflectLabel && (
                <button
                  type="button"
                  onClick={() => setShowJdEditor(false)}
                  className="text-xs text-muted underline hover:text-foreground"
                >
                  {s.jd.collapse}
                </button>
              )}
            </div>
          ) : (
            !jdReflectLabel && (
              <button
                type="button"
                onClick={() => setShowJdEditor(true)}
                className="text-xs text-muted underline hover:text-foreground"
              >
                {s.jd.manual}
              </button>
            )
          )}
        </div>
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{s.job.title}</h2>
        <select
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          className="input-luxe w-full"
        >
          {JOB_ROLES.map((r) => (
            <option key={r} value={r}>
              {jobRoleLabel(r)}
            </option>
          ))}
        </select>
      </section>

      {persona && (
        <section className="band-periwinkle animate-note-pop space-y-2 p-6 text-center">
          <p className="section-eyebrow text-white/80">{s.persona.eyebrow}</p>
          <h3 className="text-xl font-bold">{persona.name}</h3>
          <p className="mx-auto max-w-md text-sm text-white/90">{persona.description}</p>
        </section>
      )}

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{s.prepMode.title}</h2>
        <p className="text-xs leading-relaxed text-muted">{s.prepMode.hint}</p>
        <div className="flex flex-wrap gap-2">
          {(["COMPETENCY_SET", "COMPANY_TARGET"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPrepMode(mode)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                prepMode === mode
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/25"
                  : "border-card-border text-foreground hover:border-primary/30"
              }`}
            >
              {mode === "COMPETENCY_SET" ? s.prepMode.competencySet : s.prepMode.companyTarget}
            </button>
          ))}
        </div>
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{s.competency.title}</h2>
        <p className="text-xs leading-relaxed text-muted">
          {s.competency.hint}
          {persona && ` · ⭐ ${s.competency.recommended}`}
        </p>
        {planId && (
          <p className="text-sm text-accent">
            {s.competency.plan} · {completedCount}/{COMPETENCY_CODES.length}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {competencies.map((c) => {
            const done = c.status === "COMPLETED";
            const active = focusCompetencies.includes(c.code);
            const jdRecommended = Boolean(
              jdAnalysis?.recommendedCompetency === c.code && !done
            );
            const recommended = Boolean(
              !active &&
                persona &&
                !done &&
                (persona.focusCompetencies as string[]).includes(c.code)
            );
            return (
              <button
                key={c.code}
                type="button"
                disabled={done}
                aria-pressed={active}
                onClick={() => {
                  competencyManuallyChanged.current = true;
                  setFocusCompetencies((prev) =>
                    prev.includes(c.code)
                      ? prev.filter((code) => code !== c.code)
                      : [...prev, c.code]
                  );
                }}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  done
                    ? "border-success/30 bg-success/5 text-muted"
                    : active
                      ? "border-gold bg-gold/10 text-foreground ring-1 ring-gold/30"
                      : "border-card-border text-foreground hover:border-gold/40"
                }`}
              >
                <span className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      done
                        ? "border-success/40 bg-success/20"
                        : active
                          ? "border-gold bg-gold text-white"
                          : "border-card-border"
                    }`}
                  >
                    {(active || done) && "✓"}
                  </span>
                  <span className="font-medium">
                    {c.label}
                    {jdRecommended && (
                      <span
                        className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold"
                        title={jdAnalysis?.competencyRationale ?? undefined}
                      >
                        📄 공고 분석 추천
                      </span>
                    )}
                    {recommended && (
                      <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        ⭐ {s.competency.recommended}
                      </span>
                    )}
                  </span>
                </span>
                <span className="mt-1 block pl-6 text-xs opacity-70">
                  {done
                    ? `${s.competency.done} · L${c.levelEst ?? "-"}`
                    : c.status === "IN_PROGRESS"
                      ? s.competency.inProgress
                      : s.competency.notStarted}
                </span>
              </button>
            );
          })}
        </div>
        {focusCompetencies.length > 1 && (
          <p className="text-xs text-accent">
            {locale === "ko"
              ? `${competencyLabel(focusCompetencies[0])}부터 시작하고, 이번 차수에서 선택한 ${focusCompetencies.length}개 역량을 모두 물어봅니다.`
              : `Starting with ${competencyLabel(focusCompetencies[0])} — all ${focusCompetencies.length} selected competencies in this round.`}
          </p>
        )}

        <div className="space-y-2 border-t border-card-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">{s.timeBudget.title}</h3>
          <p className="text-xs leading-relaxed text-muted">{s.timeBudget.hint}</p>
          <div className="flex flex-wrap gap-2">
            {TIME_BUDGET_MINUTES_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTimeBudgetMinutes(n)}
                className={`min-w-[4.5rem] rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  timeBudgetMinutes === n
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/25"
                    : "border-card-border text-foreground hover:border-primary/30"
                }`}
              >
                {n}
                <span className="ml-1 text-xs font-normal opacity-70">{s.timeBudget.unit}</span>
              </button>
            ))}
          </div>
          {focusCompetencies.length > 0 && (
            <p className="text-xs text-muted">
              {s.timeBudget.perCompetency
                .replace("{minutes}", String(timeBudgetMinutes))
                .replace(
                  "{questions}",
                  String(
                    questionsPerCompetencyForRound(timeBudgetMinutes, focusCompetencies.length),
                  ),
                )}
            </p>
          )}
        </div>
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{s.resume.title}</h2>
        <p className="text-xs leading-relaxed text-muted">{s.resume.hint}</p>
        <label
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 transition ${
            parsingFile
              ? "border-accent/50 bg-accent/5"
              : "border-card-border hover:border-gold/50 hover:bg-gold/5"
          }`}
        >
          {parsingFile ? (
            <>
              <IconLoader className="h-8 w-8 text-accent" />
              <span className="text-sm text-accent">파일에서 텍스트 추출 중…</span>
            </>
          ) : (
            <>
              <IconUpload className="h-8 w-8 text-muted" />
              <span className="text-sm text-muted">{s.resume.upload}</span>
            </>
          )}
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={parsingFile}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {fileError && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {fileError}
          </p>
        )}

        {resumeReflectLabel && !showResumeEditor && (
          <ReflectChip
            label={resumeReflectLabel}
            editLabel={s.resume.viewEdit}
            removeLabel={s.resume.remove}
            onEdit={() => setShowResumeEditor(true)}
            onRemove={clearResume}
          />
        )}

        {showResumeEditor ? (
          <div className="space-y-2">
            <textarea
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                if (uploadedFileName) setUploadedFileName(null);
              }}
              rows={6}
              placeholder={s.resume.placeholder}
              className="input-luxe w-full text-sm"
            />
            {resumeReflectLabel && (
              <button
                type="button"
                onClick={() => setShowResumeEditor(false)}
                className="text-xs text-muted underline hover:text-foreground"
              >
                {s.resume.collapse}
              </button>
            )}
          </div>
        ) : (
          !resumeReflectLabel && (
            <button
              type="button"
              onClick={() => setShowResumeEditor(true)}
              className="text-xs text-muted underline hover:text-foreground"
            >
              {s.resume.manual}
            </button>
          )
        )}
        <div className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 via-transparent to-transparent p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
              <FilePenLine className="h-5 w-5 text-accent" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">AI 자소서 첨삭</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                공고·산업 기준 총평, 문단별 피드백, 키워드 매칭을 한 번에 받을 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestResumeReview}
            disabled={!canRequestReview}
            className="btn-review"
          >
            {reviewLoading ? (
              <>
                <IconLoader /> {s.resumeReview.preparing}
              </>
            ) : (
              <>
                <FilePenLine className="h-4 w-4" aria-hidden />
                {s.resumeReview.button}
              </>
            )}
          </button>
          {!canRequestReview && !reviewLoading && (
            <p className="text-center text-xs text-muted">
              {!industry
                ? s.resumeReview.needIndustry
                : resumeDraft.length < 20
                  ? s.resumeReview.needResume
                  : parsingFile
                    ? s.resume.parsing
                    : null}
            </p>
          )}
        </div>
      </section>

      {(featureFlags.tripleFeedbackMode ||
        featureFlags.jdBonusQuestion ||
        featureFlags.resumeClaimVerification) && (
      <section className="card-luxe space-y-2 p-5">
        {featureFlags.tripleFeedbackMode && (
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={tripleFeedbackMode}
              onChange={(e) => setTripleFeedbackMode(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-foreground">{s.tripleFeedback.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {s.tripleFeedback.hint}
              </span>
            </span>
          </label>
        )}
        {featureFlags.jdBonusQuestion && jdText.trim().length > 0 && (
          <label className="flex cursor-pointer gap-3 rounded-xl border border-border/60 bg-surface/40 p-4 transition hover:border-gold/40">
            <input
              type="checkbox"
              checked={jdBonusEnabled}
              onChange={(e) => setJdBonusEnabled(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-foreground">{s.jdBonus.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {s.jdBonus.hint}
              </span>
            </span>
          </label>
        )}
        {featureFlags.resumeClaimVerification && resumeText.trim().length > 0 && (
          <label className="flex cursor-pointer gap-3 rounded-xl border border-border/60 bg-surface/40 p-4 transition hover:border-gold/40">
            <input
              type="checkbox"
              checked={resumeClaimEnabled}
              onChange={(e) => setResumeClaimEnabled(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-foreground">{s.resumeClaim.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {s.resumeClaim.hint}
              </span>
            </span>
          </label>
        )}
      </section>
      )}

      <button
        type="button"
        onClick={startInterview}
        disabled={
          loading || parsingFile || parsingJdFile || !industry || focusCompetencies.length === 0
        }
        className="btn-primary w-full py-3.5"
      >
        {loading ? (
          <>
            <IconLoader /> {s.preparing}
          </>
        ) : focusCompetencies.length > 1 ? (
          `${competencyLabel(focusCompetency || "COMMUNICATION")} ${s.start} (1/${focusCompetencies.length})`
        ) : (
          `${competencyLabel(focusCompetency || "COMMUNICATION")} ${s.start}`
        )}
      </button>

      {loading && (
        <div className="card-luxe mt-4 px-3">
          <LoadingRitual variant="setup" competencyCode={focusCompetency} compact />
        </div>
      )}
    </div>
  );
}
