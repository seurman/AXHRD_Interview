"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconLoader, IconUpload } from "@/components/ui/icons";
import { jobRoleLabel, competencyLabel } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";

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
  const [companyName, setCompanyName] = useState("");
  const [jobRole, setJobRole] = useState<string>("MARKETING");
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
  const [companyPreview, setCompanyPreview] = useState<{
    industry: string;
    size: string;
    tone: string;
  } | null>(null);

  const loadProgress = useCallback(async (email: string) => {
    if (!email.includes("@")) return;
    const res = await fetch(
      `/api/candidates/progress?email=${encodeURIComponent(email)}`
    );
    if (!res.ok) return;
    const data = await res.json();
    if (data.name) void 0;
    if (data.plan?.id) setPlanId(data.plan.id);
    if (data.competencies) {
      setCompetencies(data.competencies);
      const next = data.competencies.find(
        (c: CompetencyRow) =>
          c.status === "IN_PROGRESS" || c.status === "NOT_STARTED"
      );
      if (next) setFocusCompetency(next.code);
    }
  }, []);

  useEffect(() => {
    const pid = searchParams.get("planId");
    const comp = searchParams.get("competency");
    if (pid) setPlanId(pid);
    if (comp) setFocusCompetency(comp);
    loadProgress(user.email);
  }, [searchParams, user.email, loadProgress]);

  const previewCompany = async () => {
    if (!companyName.trim()) return;
    const res = await fetch("/api/companies/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: companyName }),
    });
    if (res.ok) {
      const data = await res.json();
      setCompanyPreview({
        industry: data.industry,
        size: data.sizeLabel,
        tone: data.interviewStyle?.tone ?? "",
      });
    }
  };

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
          return;
        }
        throw new Error(data.error ?? "Failed to start");
      }

      router.push(`/interview/${data.sessionId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "면접 시작에 실패했습니다.");
    } finally {
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
        <h2 className="font-semibold text-foreground">2. 지원 회사</h2>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onBlur={previewCompany}
          placeholder="예: 삼성전자, 카카오, 토스"
          className="input-luxe w-full"
        />
        {companyPreview && (
          <div className="rounded-lg bg-primary/5 p-3 text-sm text-muted">
            <span className="font-medium text-primary">{companyPreview.industry}</span>
            {" · "}
            {companyPreview.size}
            {" · "}
            {companyPreview.tone}
          </div>
        )}
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
          !companyName.trim() ||
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
