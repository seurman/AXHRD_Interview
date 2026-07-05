"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconLoader, IconUpload } from "@/components/ui/icons";
import { jobRoleLabel, competencyLabel, industryLabel } from "@/lib/labels";
import { COMPETENCY_CODES, INDUSTRY_CODES } from "@/types";

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

type RealQuestionPreview = {
  id: string;
  text: string;
  competency: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  isAiExample: boolean;
};

const ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

type CompetencyRow = {
  code: string;
  label: string;
  status: string;
  levelEst?: number;
  percentile?: number;
};

export function SetupForm({
  user,
}: {
  user: { id: string; name: string; email: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [industry, setIndustry] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [jobRole, setJobRole] = useState<string>("MARKETING");
  const [realQuestions, setRealQuestions] = useState<RealQuestionPreview[]>([]);
  const [loadingRealQuestions, setLoadingRealQuestions] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [focusCompetency, setFocusCompetency] = useState<string>("");
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
          if (next) setFocusCompetency(next.code);
        }
      }
    },
    []
  );

  useEffect(() => {
    const pid = searchParams.get("planId");
    const comp = searchParams.get("competency");
    if (pid) setPlanId(pid);
    if (comp) setFocusCompetency(comp);
    loadProgress(pid, Boolean(comp));
  }, [searchParams, loadProgress]);

  useEffect(() => {
    if (!industry) {
      setRealQuestions([]);
      return;
    }
    let cancelled = false;
    setLoadingRealQuestions(true);
    fetch(
      `/api/interview/real-questions?industry=${encodeURIComponent(
        industry
      )}&jobRole=${encodeURIComponent(jobRole)}`
    )
      .then((res) => (res.ok ? res.json() : { questions: [] }))
      .then((data) => {
        if (!cancelled) setRealQuestions(data.questions ?? []);
      })
      .catch(() => {
        if (!cancelled) setRealQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRealQuestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [industry, jobRole]);

  const handleFile = async (file: File) => {
    setFileError(null);
    setParsingFile(true);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const isPlainText = ext === "txt" || ext === "md";

    try {
      if (isPlainText) {
        const text = await file.text();
        if (!text.trim()) throw new Error("파일이 비어 있습니다.");
        setResumeText(text.trim());
        setUploadedFileName(file.name);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "파일을 읽지 못했습니다.");
      setResumeText(data.text);
      setUploadedFileName(data.fileName ?? file.name);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "파일 업로드 실패");
      setUploadedFileName(null);
    } finally {
      setParsingFile(false);
    }
  };

  const startInterview = async () => {
    if (!industry) {
      alert("산업군을 선택해 주세요.");
      return;
    }
    if (!focusCompetency) {
      alert("면접할 역량을 선택해 주세요.");
      return;
    }
    if (!resumeText.trim()) {
      alert("자기소개서를 입력하거나 업로드해 주세요. 질문 개인화에 사용됩니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          companyName,
          jobRole,
          resumeText,
          resumeFileName: uploadedFileName,
          planId,
          focusCompetency,
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

      router.push(`/interview/${data.sessionId}`);
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

  const completedCount = competencies.filter((c) => c.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">모의 면접 설정</h1>
        <p className="mt-2 text-muted">
          {user.name}님 · 역량별 2~3문항 · 피드백 저장 · 자소서 기반 질문
        </p>
      </div>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">1. 역량 선택</h2>
        <p className="text-xs text-muted">한 번에 하나의 역량 · 문항 2~3개</p>
        {planId && (
          <p className="text-sm text-accent">
            진행 중인 플랜 · {completedCount}/{COMPETENCY_CODES.length} 역량 완료
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {competencies.map((c) => {
            const done = c.status === "COMPLETED";
            const active = focusCompetency === c.code;
            return (
              <button
                key={c.code}
                type="button"
                disabled={done}
                onClick={() => setFocusCompetency(c.code)}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  done
                    ? "border-success/30 bg-success/5 text-muted"
                    : active
                      ? "border-gold bg-gold/10 text-foreground ring-1 ring-gold/30"
                      : "border-card-border text-foreground hover:border-gold/40"
                }`}
              >
                <span className="font-medium">{c.label}</span>
                <span className="mt-1 block text-xs opacity-70">
                  {done
                    ? `완료 · L${c.levelEst ?? "-"}`
                    : c.status === "IN_PROGRESS"
                      ? "진행 중"
                      : "미시작"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">2. 산업군</h2>
        <p className="text-xs text-muted">
          특정 회사보다 산업군 기준이 질문 톤을 더 안정적으로 맞춰줍니다.
        </p>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="input-luxe w-full"
        >
          <option value="" disabled>
            선택해 주세요
          </option>
          {INDUSTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {industryLabel(code)}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="지원 회사명 (선택 — 있으면 질문 문구에 반영)"
          className="input-luxe w-full text-sm"
        />
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">3. 지원 직무</h2>
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

        {industry && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted">
              {industryLabel(industry)} · {jobRoleLabel(jobRole)} 실제 기출 질문 참고
            </p>
            {loadingRealQuestions ? (
              <p className="text-xs text-muted">불러오는 중…</p>
            ) : realQuestions.length === 0 ? (
              <p className="text-xs text-muted">아직 등록된 참고 질문이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {realQuestions.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-lg bg-background p-3 text-xs text-muted"
                  >
                    <p className="text-foreground">{q.text}</p>
                    <p className="mt-1 opacity-70">
                      {q.isAiExample
                        ? "AI 생성 예시 질문"
                        : `출처: ${q.sourceName ?? "공개 커뮤니티"}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">4. 자기소개서</h2>
        <p className="text-xs text-muted">
          업로드한 내용이 면접 질문에 직접 반영됩니다
        </p>
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
              <span className="text-sm text-muted">PDF · Word · TXT 업로드</span>
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
        {uploadedFileName && !fileError && (
          <p className="text-sm text-success">✓ {uploadedFileName}</p>
        )}
        {fileError && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {fileError}
          </p>
        )}
        <textarea
          value={resumeText}
          onChange={(e) => {
            setResumeText(e.target.value);
            setUploadedFileName(null);
            setFileError(null);
          }}
          rows={6}
          placeholder="자기소개서 내용을 붙여넣거나 위에서 파일을 업로드하세요…"
          className="input-luxe w-full text-sm"
        />
      </section>

      <button
        type="button"
        onClick={startInterview}
        disabled={
          loading ||
          parsingFile ||
          !industry ||
          !resumeText.trim() ||
          !focusCompetency
        }
        className="btn-primary w-full py-3.5"
      >
        {loading ? (
          <>
            <IconLoader /> 준비 중…
          </>
        ) : (
          `${competencyLabel(focusCompetency || "COMMUNICATION")} 역량 면접 시작`
        )}
      </button>
    </div>
  );
}
