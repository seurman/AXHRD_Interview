"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconLoader, IconUpload } from "@/components/ui/icons";
import { jobRoleLabel, competencyLabel, industryLabel } from "@/lib/labels";
import { COMPETENCY_CODES, INDUSTRY_CODES } from "@/types";
import type { IndustryCode, JobRoleCode } from "@/types";
import { matchPersona } from "@/lib/interview/persona-archetype";

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
  const [industry, setIndustry] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [jdFileError, setJdFileError] = useState<string | null>(null);
  const [parsingJdFile, setParsingJdFile] = useState(false);
  const [showJdManualInput, setShowJdManualInput] = useState(false);
  const [jobRole, setJobRole] = useState<string>("MARKETING");
  const [fileResumeText, setFileResumeText] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [focusCompetency, setFocusCompetency] = useState<string>("");
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
    if (comp) {
      setFocusCompetency(comp);
      competencyManuallyChanged.current = true;
    }
    loadProgress(pid, Boolean(comp));
  }, [searchParams, loadProgress]);

  // 산업+직무를 다 고르면(페르소나가 계산되면) 그 페르소나가 특히 중요하게 보는 역량
  // (focusCompetencies) 중 아직 완료하지 않은 첫 번째 역량을 기본 선택으로 추천한다.
  // NCS "직업기초능력"은 모든 직무 공통이라 역량 선택 자체를 막지는 않되(자유롭게
  // 다른 역량도 고를 수 있음), 실제 채용에서 직무별로 중점 역량이 다르다는 관행을
  // 반영한 추천일 뿐이다 — 사용자가 이미 직접 역량을 고른 뒤라면 덮어쓰지 않는다.
  useEffect(() => {
    if (!persona || competencyManuallyChanged.current) return;
    const recommended = persona.focusCompetencies.find((code) => {
      const row = competencies.find((c) => c.code === code);
      return row && row.status !== "COMPLETED";
    });
    if (recommended) setFocusCompetency(recommended);
  }, [persona, competencies]);

  const handleFile = async (file: File) => {
    setFileError(null);
    setParsingFile(true);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const isPlainText = ext === "txt" || ext === "md";

    try {
      if (isPlainText) {
        const text = await file.text();
        if (!text.trim()) throw new Error("파일이 비어 있습니다.");
        setFileResumeText(text.trim());
        setUploadedFileName(file.name);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "파일을 읽지 못했습니다.");
      setFileResumeText(data.text);
      setUploadedFileName(data.fileName ?? file.name);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "파일 업로드 실패");
      setUploadedFileName(null);
    } finally {
      setParsingFile(false);
    }
  };

  const handleJdFile = async (file: File) => {
    setJdFileError(null);
    setParsingJdFile(true);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const isPlainText = ext === "txt" || ext === "md";

    try {
      if (isPlainText) {
        const text = await file.text();
        if (!text.trim()) throw new Error("파일이 비어 있습니다.");
        setJdText(text.trim());
        setJdFileName(file.name);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "파일을 읽지 못했습니다.");
      setJdText(data.text);
      setJdFileName(data.fileName ?? file.name);
    } catch (e) {
      setJdFileError(e instanceof Error ? e.message : "파일 업로드 실패");
      setJdFileName(null);
    } finally {
      setParsingJdFile(false);
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
    setLoading(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          companyName,
          jobRole,
          resumeText: manualText.trim() || fileResumeText,
          resumeFileName: uploadedFileName,
          planId,
          focusCompetency,
          jdText,
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
          {user.name}님 · 역량별 2~3문항 · 피드백 저장 · 자소서는 선택 사항
        </p>
      </div>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">1. 산업군</h2>
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

        <div className="space-y-2">
          <p className="text-xs text-muted">
            채용공고(JD)·인재상을 업로드하면 이 회사·직무에 맞는 면접 톤과 중점 역량을
            분석해 질문에 반영합니다. (선택)
          </p>
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
                <span className="text-sm text-accent">파일에서 텍스트 추출 중…</span>
              </>
            ) : (
              <>
                <IconUpload className="h-7 w-7 text-muted" />
                <span className="text-sm text-muted">PDF · Word · TXT 업로드</span>
              </>
            )}
            <input
              type="file"
              accept={ACCEPT}
              className="hidden"
              disabled={parsingJdFile}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleJdFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {jdFileName && !jdFileError && (
            <p className="text-sm text-success">✓ {jdFileName} 업로드됨</p>
          )}
          {jdFileError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {jdFileError}
            </p>
          )}

          {showJdManualInput ? (
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={5}
              placeholder="채용공고(JD) 원문이나 인재상 키워드를 붙여넣으세요…"
              className="input-luxe w-full text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowJdManualInput(true)}
              className="text-xs text-muted underline hover:text-foreground"
            >
              파일 대신 텍스트로 직접 입력
            </button>
          )}
        </div>
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">2. 지원 직무</h2>
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
          <p className="text-xs font-medium uppercase tracking-widest text-white/80">
            당신의 면접 페르소나
          </p>
          <h3 className="text-xl font-bold">{persona.name}</h3>
          <p className="mx-auto max-w-md text-sm text-white/90">{persona.description}</p>
        </section>
      )}

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">3. 역량 선택</h2>
        <p className="text-xs text-muted">
          한 번에 하나의 역량 · 문항 2~3개
          {persona && " · ⭐ 표시는 선택한 직무에서 특히 중요하게 보는 역량 추천"}
        </p>
        {planId && (
          <p className="text-sm text-accent">
            진행 중인 플랜 · {completedCount}/{COMPETENCY_CODES.length} 역량 완료
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {competencies.map((c) => {
            const done = c.status === "COMPLETED";
            const active = focusCompetency === c.code;
            const recommended = Boolean(
              persona &&
                !done &&
                (persona.focusCompetencies as string[]).includes(c.code)
            );
            return (
              <button
                key={c.code}
                type="button"
                disabled={done}
                onClick={() => {
                  competencyManuallyChanged.current = true;
                  setFocusCompetency(c.code);
                }}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  done
                    ? "border-success/30 bg-success/5 text-muted"
                    : active
                      ? "border-gold bg-gold/10 text-foreground ring-1 ring-gold/30"
                      : "border-card-border text-foreground hover:border-gold/40"
                }`}
              >
                <span className="font-medium">
                  {c.label}
                  {recommended && (
                    <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      ⭐ 추천
                    </span>
                  )}
                </span>
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
        <h2 className="font-semibold text-foreground">4. 자기소개서 (선택)</h2>
        <p className="text-xs text-muted">
          업로드하면 첫 질문에 내용이 반영됩니다. 내용은 화면에 표시되지 않고 질문 생성에만
          쓰입니다. 없어도 일반 질문으로 면접을 진행할 수 있습니다.
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
          <p className="text-sm text-success">✓ {uploadedFileName} 업로드됨</p>
        )}
        {fileError && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {fileError}
          </p>
        )}

        {showManualInput ? (
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={6}
            placeholder="자기소개서 내용을 붙여넣으세요…"
            className="input-luxe w-full text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            className="text-xs text-muted underline hover:text-foreground"
          >
            파일 대신 텍스트로 직접 입력
          </button>
        )}
      </section>

      <button
        type="button"
        onClick={startInterview}
        disabled={loading || parsingFile || parsingJdFile || !industry || !focusCompetency}
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
