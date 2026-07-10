"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Globe,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { RepositoryCompetencyRow } from "@/lib/repository/types";
import { defaultScoreLevels, LIFECYCLE_LABEL } from "@/lib/repository/types";

type RubricDetail = {
  id: string;
  scoreLevel: number;
  levelName: string | null;
  behavioralIndicator: string;
};

type RubricSet = {
  id: string;
  rubricName: string;
  scoringSystem: "FIVE_SCALE" | "THREE_SCALE" | "PASS_FAIL";
  isDefault: boolean;
  organization: { id: string; name: string } | null;
  details: RubricDetail[];
  _count?: { questionMappings: number };
};

type QuestionRow = {
  id: string;
  externalId: string;
  template: string;
  level: number;
  rubricMappings: Array<{
    id: string;
    rubricSet: { id: string; rubricName: string };
  }>;
};

type ValidationResult = {
  totalQuestions: number;
  missingMappingCount: number;
  missingQuestions: Array<{
    id: string;
    externalId: string;
    questionText: string;
    level: number;
  }>;
  ok: boolean;
};

type OrgOption = { id: string; name: string };

type Props = {
  competency: RepositoryCompetencyRow | null;
};

const SCORING_LABEL = {
  FIVE_SCALE: "5점 척도",
  THREE_SCALE: "3점 척도",
  PASS_FAIL: "Pass / Fail",
} as const;

export function RubricQuestionMapper({ competency }: Props) {
  const [rubricSets, setRubricSets] = useState<RubricSet[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mappingBusy, setMappingBusy] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [form, setForm] = useState({
    rubricName: "",
    scoringSystem: "FIVE_SCALE" as RubricSet["scoringSystem"],
    organizationId: "" as string,
    isDefault: false,
    details: defaultScoreLevels("FIVE_SCALE").map((scoreLevel) => ({
      scoreLevel,
      levelName: "",
      behavioralIndicator: "",
    })),
  });

  const loadAll = useCallback(async () => {
    if (!competency) return;
    setLoading(true);
    try {
      const [rubRes, qRes, valRes, orgRes] = await Promise.all([
        fetch(`/api/admin/repository/rubric-sets?competencyId=${competency.id}`),
        fetch(`/api/admin/repository/questions?competencyId=${competency.id}`),
        fetch(`/api/admin/repository/competencies/${competency.id}/validation`),
        fetch("/api/admin/organizations"),
      ]);
      const [rubData, qData, valData, orgData] = await Promise.all([
        rubRes.json(),
        qRes.json(),
        valRes.json(),
        orgRes.json(),
      ]);
      if (rubRes.ok) setRubricSets(rubData.rubricSets ?? []);
      if (qRes.ok) setQuestions(qData.questions ?? []);
      if (valRes.ok) setValidation(valData);
      if (orgRes.ok) {
        setOrgs(
          (orgData.organizations ?? []).map((o: { id: string; name: string }) => ({
            id: o.id,
            name: o.name,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [competency]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (!competency) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
        <p className="text-sm text-muted">좌측 목록에서 역량을 선택하면 루브릭·질문 매핑을 편집할 수 있습니다.</p>
      </section>
    );
  }

  const selectedCompetency = competency;

  async function saveRubricSet() {
    setBusy("save-rubric");
    try {
      const res = await fetch("/api/admin/repository/rubric-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencyId: selectedCompetency.id,
          rubricName: form.rubricName,
          scoringSystem: form.scoringSystem,
          organizationId: form.organizationId || null,
          isDefault: form.isDefault,
          details: form.details.filter((d) => d.behavioralIndicator.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      setShowForm(false);
      setForm({
        rubricName: "",
        scoringSystem: "FIVE_SCALE",
        organizationId: "",
        isDefault: false,
        details: defaultScoreLevels("FIVE_SCALE").map((scoreLevel) => ({
          scoreLevel,
          levelName: "",
          behavioralIndicator: "",
        })),
      });
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(null);
    }
  }

  async function mapQuestion(questionId: string, rubricSetId: string) {
    setMappingBusy(questionId);
    try {
      const res = await fetch("/api/admin/repository/question-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, rubricSetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "매핑 실패");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "매핑 실패");
    } finally {
      setMappingBusy(null);
    }
  }

  async function addQuestion() {
    if (!newQuestion.trim()) return;
    setBusy("add-q");
    try {
      const res = await fetch("/api/admin/repository/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencyId: selectedCompetency.id,
          questionText: newQuestion.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "질문 추가 실패");
      setNewQuestion("");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "질문 추가 실패");
    } finally {
      setBusy(null);
    }
  }

  const missingIds = new Set(validation?.missingQuestions.map((q) => q.id) ?? []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gold">선택 역량</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                {competency.nameKo}{" "}
                <span className="font-mono text-sm font-normal text-muted">({competency.code})</span>
              </h2>
              <p className="mt-1 text-sm text-muted">
                {LIFECYCLE_LABEL[competency.lifecycleStatus]} · 질문 {competency.questionCount}개
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
            >
              <Plus className="h-4 w-4" />
              루브릭 세트 추가
            </button>
          </div>
        </div>

        {showForm && (
          <div className="border-b border-border bg-muted/15 px-4 py-4 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                placeholder="루브릭 이름"
                value={form.rubricName}
                onChange={(e) => setForm((f) => ({ ...f, rubricName: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <select
                value={form.scoringSystem}
                onChange={(e) => {
                  const scoringSystem = e.target.value as RubricSet["scoringSystem"];
                  setForm((f) => ({
                    ...f,
                    scoringSystem,
                    details: defaultScoreLevels(scoringSystem).map((scoreLevel) => {
                      const existing = f.details.find((d) => d.scoreLevel === scoreLevel);
                      return (
                        existing ?? {
                          scoreLevel,
                          levelName: "",
                          behavioralIndicator: "",
                        }
                      );
                    }),
                  }));
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(SCORING_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={form.organizationId}
                onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">플랫폼 공통 (tenant 0)</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                기본 루브릭
              </label>
            </div>
            <div className="mt-4 space-y-2">
              {form.details.map((d, idx) => (
                <div key={d.scoreLevel} className="grid gap-2 sm:grid-cols-[80px_120px_1fr]">
                  <span className="flex items-center text-sm font-semibold tabular-nums">
                    {d.scoreLevel}점
                  </span>
                  <input
                    placeholder="레벨명"
                    value={d.levelName}
                    onChange={(e) => {
                      const details = [...form.details];
                      details[idx] = { ...details[idx], levelName: e.target.value };
                      setForm((f) => ({ ...f, details }));
                    }}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="행동 지표 · 채점 기준"
                    value={d.behavioralIndicator}
                    onChange={(e) => {
                      const details = [...form.details];
                      details[idx] = { ...details[idx], behavioralIndicator: e.target.value };
                      setForm((f) => ({ ...f, details }));
                    }}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={busy === "save-rubric"}
              onClick={() => void saveRubricSet()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {busy === "save-rubric" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              저장
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            불러오는 중…
          </div>
        ) : rubricSets.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted">등록된 루브릭 세트가 없습니다.</p>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {rubricSets.map((set) => (
              <article
                key={set.id}
                className={`rounded-xl border p-4 ${
                  set.isDefault ? "border-accent/40 bg-accent/5" : "border-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{set.rubricName}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      {set.organization ? (
                        <>
                          <Building2 className="h-3 w-3" />
                          {set.organization.name}
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3" />
                          플랫폼 공통
                        </>
                      )}
                    </p>
                  </div>
                  {set.isDefault && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                      기본
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted">{SCORING_LABEL[set.scoringSystem]}</p>
                <ul className="mt-3 space-y-2">
                  {set.details.map((d) => (
                    <li
                      key={d.id}
                      className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent">
                          {d.scoreLevel}
                        </span>
                        {d.levelName && <span>{d.levelName}</span>}
                      </div>
                      <p className="mt-1 leading-relaxed text-muted">{d.behavioralIndicator}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">
                  매핑된 질문 {set._count?.questionMappings ?? 0}개
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">질문 · 루브릭 매핑</h2>
            <p className="mt-0.5 text-sm text-muted">채점 기준 누락 질문을 즉시 확인하고 연결하세요.</p>
          </div>
          {validation && (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                validation.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {validation.ok ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {validation.ok
                ? "모든 질문에 루브릭 연결됨"
                : `루브릭 누락 ${validation.missingMappingCount}건`}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-3 sm:px-6">
          <input
            placeholder="새 질문 텍스트"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy === "add-q"}
            onClick={() => void addQuestion()}
            className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/30 disabled:opacity-50"
          >
            질문 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium sm:px-6">코드</th>
                <th className="px-4 py-3 font-medium">질문</th>
                <th className="px-4 py-3 font-medium">Lv</th>
                <th className="px-4 py-3 font-medium">루브릭</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const isMissing = missingIds.has(q.id);
                const mapped = q.rubricMappings[0]?.rubricSet;
                return (
                  <tr
                    key={q.id}
                    className={`border-b border-border/60 ${
                      isMissing ? "border-red-200 bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs sm:px-6">{q.externalId}</td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 text-foreground">{q.template}</p>
                      {isMissing && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          ⚠️ 루브릭 누락
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{q.level}</td>
                    <td className="px-4 py-3">
                      <select
                        value={mapped?.id ?? ""}
                        disabled={mappingBusy === q.id || rubricSets.length === 0}
                        onChange={(e) => {
                          if (e.target.value) void mapQuestion(q.id, e.target.value);
                        }}
                        className={`w-full max-w-xs rounded-lg border px-2 py-1.5 text-sm ${
                          isMissing
                            ? "border-red-300 bg-white font-medium text-red-800"
                            : "border-border bg-background"
                        }`}
                      >
                        <option value="">— 루브릭 선택 —</option>
                        {rubricSets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.rubricName}
                            {s.organization ? ` (${s.organization.name})` : " (공통)"}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {questions.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted">
                    등록된 질문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
