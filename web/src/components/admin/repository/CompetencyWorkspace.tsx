"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Layers,
  Link2,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { RepositoryCompetencyRow } from "@/lib/repository/types";
import { defaultScoreLevels, LIFECYCLE_LABEL } from "@/lib/repository/types";
import { COVERAGE_LABEL, type QuestionCoverageKind } from "@/lib/repository/coverage";

type WorkspaceTab = "overview" | "rubrics" | "questions";

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

type WorkspaceQuestion = {
  id: string;
  externalId: string;
  template: string;
  level: number;
  rubricCriteria: string[];
  coverage: { kind: QuestionCoverageKind; criteriaCount: number };
  mappedRubric: { id: string; rubricName: string } | null;
};

type WorkspaceData = {
  competency: RepositoryCompetencyRow & { rubricSetCount: number; clusterCode: string | null };
  legacyRubric: { levels: Array<{ level: number; criteria: string[] }>; hasData: boolean };
  rubricSets: RubricSet[];
  questions: WorkspaceQuestion[];
  validation: {
    totalQuestions: number;
    missingMappingCount: number;
    needsNormalizedMapping: number;
    ok: boolean;
    coverage: Record<QuestionCoverageKind, number>;
  };
};

type OrgOption = { id: string; name: string };

const SCORING_LABEL = {
  FIVE_SCALE: "5점 척도",
  THREE_SCALE: "3점 척도",
  PASS_FAIL: "Pass / Fail",
} as const;

const COVERAGE_BADGE: Record<
  QuestionCoverageKind,
  { className: string; icon: typeof CheckCircle2 }
> = {
  mapped: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  question_criteria: {
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: BookOpen,
  },
  competency_level: {
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Layers,
  },
  missing: { className: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
};

type Props = {
  competency: RepositoryCompetencyRow;
  onRefreshList?: () => void;
};

export function CompetencyWorkspace({ competency, onRefreshList }: Props) {
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<"all" | "missing" | "unmapped">("all");
  const [form, setForm] = useState({
    rubricName: "",
    scoringSystem: "FIVE_SCALE" as RubricSet["scoringSystem"],
    organizationId: "",
    isDefault: true,
    details: defaultScoreLevels("FIVE_SCALE").map((scoreLevel) => ({
      scoreLevel,
      levelName: "",
      behavioralIndicator: "",
    })),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wsRes, orgRes] = await Promise.all([
        fetch(`/api/admin/repository/competencies/${competency.id}/workspace`),
        fetch("/api/admin/organizations"),
      ]);
      const wsData = await wsRes.json();
      if (wsRes.ok) setData(wsData);
      if (orgRes.ok) {
        const orgData = await orgRes.json();
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
  }, [competency.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    if (questionFilter === "missing") {
      return data.questions.filter((q) => q.coverage.kind === "missing");
    }
    if (questionFilter === "unmapped") {
      return data.questions.filter((q) => !q.mappedRubric);
    }
    return data.questions;
  }, [data, questionFilter]);

  async function importLegacy() {
    setBusy("import");
    try {
      const res = await fetch(
        `/api/admin/repository/competencies/${competency.id}/import-legacy-rubric`,
        { method: "POST" },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "가져오기 실패");
      await load();
      setTab("rubrics");
    } catch (e) {
      alert(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setBusy(null);
    }
  }

  async function bulkMap() {
    setBusy("bulk");
    try {
      const res = await fetch(
        `/api/admin/repository/competencies/${competency.id}/bulk-map`,
        { method: "POST" },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "일괄 연결 실패");
      await load();
      onRefreshList?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "일괄 연결 실패");
    } finally {
      setBusy(null);
    }
  }

  async function saveRubricSet() {
    setBusy("save");
    try {
      const res = await fetch("/api/admin/repository/rubric-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencyId: competency.id,
          rubricName: form.rubricName,
          scoringSystem: form.scoringSystem,
          organizationId: form.organizationId || null,
          isDefault: form.isDefault,
          details: form.details.filter((d) => d.behavioralIndicator.trim()),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "저장 실패");
      setShowForm(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(null);
    }
  }

  async function mapQuestion(questionId: string, rubricSetId: string) {
    setBusy(`map-${questionId}`);
    try {
      const res = await fetch("/api/admin/repository/question-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, rubricSetId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "매핑 실패");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "매핑 실패");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-sm text-red-700">
        역량 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  const { validation, legacyRubric, rubricSets } = data;
  const defaultSet = rubricSets.find((s) => s.isDefault && !s.organization);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">선택 역량</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">{data.competency.nameKo}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="font-mono text-xs">{data.competency.code}</span>
              <span>·</span>
              <span>{data.competency.category}</span>
              <span>·</span>
              <span>{LIFECYCLE_LABEL[data.competency.lifecycleStatus]}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/content?competency=${data.competency.code}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/30"
            >
              <ExternalLink className="h-4 w-4" />
              문항 뱅크에서 편집
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="질문" value={validation.totalQuestions} tone="neutral" />
          <StatCard label="루브릭 세트" value={rubricSets.length} tone="neutral" />
          <StatCard
            label="정규 매핑"
            value={validation.coverage.mapped}
            tone="good"
            hint={`미연결 ${validation.needsNormalizedMapping}건`}
          />
          <StatCard
            label="채점 공백"
            value={validation.coverage.missing}
            tone={validation.coverage.missing > 0 ? "bad" : "good"}
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {(
          [
            ["overview", "개요"],
            ["rubrics", "루브릭"],
            ["questions", "질문 & 채점"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === key ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground">채점 커버리지</h3>
            <p className="mt-1 text-sm text-muted">
              정규 루브릭 세트 · 문항별 기준 · 역량 L-루브릭 순으로 채점 가능 여부를 판단합니다.
            </p>
            <ul className="mt-4 space-y-2">
              {(Object.keys(COVERAGE_LABEL) as QuestionCoverageKind[]).map((kind) => (
                <li
                  key={kind}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span>{COVERAGE_LABEL[kind]}</span>
                  <span className="font-semibold tabular-nums">{validation.coverage[kind]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground">빠른 작업</h3>
            <div className="mt-4 space-y-2">
              {legacyRubric.hasData && rubricSets.length === 0 && (
                <ActionButton
                  icon={Download}
                  label="기존 역량 L-루브릭 → 세트로 가져오기"
                  description="문항 뱅크 CMS에 저장된 rubricByLevel을 플랫폼 표준 세트로 변환"
                  busy={busy === "import"}
                  onClick={() => void importLegacy()}
                />
              )}
              {defaultSet && validation.needsNormalizedMapping > 0 && (
                <ActionButton
                  icon={Link2}
                  label={`미연결 ${validation.needsNormalizedMapping}문항 → 기본 루브릭 일괄 연결`}
                  description={`「${defaultSet.rubricName}」 세트에 연결`}
                  busy={busy === "bulk"}
                  onClick={() => void bulkMap()}
                />
              )}
              <ActionButton
                icon={ArrowRight}
                label="문항·IRT 파라미터 편집"
                description="통합 문항 뱅크 CMS로 이동"
                href={`/admin/content?competency=${data.competency.code}`}
              />
            </div>
          </div>
        </section>
      )}

      {tab === "rubrics" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">루브릭 세트</h3>
              <p className="text-sm text-muted">테넌트별 채점 기준 · 정규화된 RubricSet</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {legacyRubric.hasData && (
                <button
                  type="button"
                  disabled={busy === "import"}
                  onClick={() => void importLegacy()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/30 disabled:opacity-50"
                >
                  {busy === "import" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  L-루브릭 가져오기
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                세트 추가
              </button>
            </div>
          </div>

          {legacyRubric.hasData && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Layers className="h-4 w-4" />
                기존 역량 L-루브릭 (문항 뱅크 CMS · rubricByLevel)
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {legacyRubric.levels.map((lv) => (
                  <div key={lv.level} className="rounded-xl border border-amber-200/60 bg-white/80 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                      Level {lv.level}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-950/80">
                      {lv.criteria.slice(0, 4).map((c) => (
                        <li key={c} className="flex gap-1.5">
                          <span className="text-amber-600">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                      {lv.criteria.length > 4 && (
                        <li className="text-amber-700">+{lv.criteria.length - 4}개 더</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showForm && (
            <RubricForm
              form={form}
              orgs={orgs}
              busy={busy === "save"}
              onChange={setForm}
              onSave={() => void saveRubricSet()}
              onCancel={() => setShowForm(false)}
            />
          )}

          {rubricSets.length === 0 ? (
            <EmptyPanel
              title="등록된 루브릭 세트가 없습니다"
              description="기존 L-루브릭을 가져오거나, 테넌트용 새 세트를 만드세요."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rubricSets.map((set) => (
                <RubricCard key={set.id} set={set} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "questions" && (
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
            <div>
              <h3 className="font-semibold text-foreground">질문 · 채점 연결</h3>
              <p className="text-sm text-muted">
                문항별 rubricCriteria와 정규 RubricSet 매핑을 함께 확인합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {validation.coverage.missing > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  채점 공백 {validation.coverage.missing}건
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  모든 문항 채점 가능
                </span>
              )}
              {defaultSet && validation.needsNormalizedMapping > 0 && (
                <button
                  type="button"
                  disabled={busy === "bulk"}
                  onClick={() => void bulkMap()}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
                >
                  일괄 연결
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2 sm:px-6">
            {(
              [
                ["all", "전체"],
                ["unmapped", "세트 미연결"],
                ["missing", "채점 공백"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setQuestionFilter(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  questionFilter === key
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-muted/30"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-border/60">
            {filteredQuestions.map((q) => {
              const badge = COVERAGE_BADGE[q.coverage.kind];
              const Icon = badge.icon;
              const isMissing = q.coverage.kind === "missing";
              return (
                <article
                  key={q.id}
                  className={`px-4 py-4 sm:px-6 ${isMissing ? "bg-red-50/80" : "hover:bg-muted/10"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted">{q.externalId}</span>
                        <span className="rounded bg-muted/40 px-1.5 py-0.5 text-xs font-medium">
                          L{q.level}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          <Icon className="h-3 w-3" />
                          {COVERAGE_LABEL[q.coverage.kind]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{q.template}</p>
                      {q.rubricCriteria.length > 0 && (
                        <div className="mt-2 rounded-lg border border-sky-200/60 bg-sky-50/50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                            문항별 채점 기준
                          </p>
                          <ul className="mt-1 space-y-0.5 text-xs text-sky-900/90">
                            {q.rubricCriteria.slice(0, 3).map((c) => (
                              <li key={c}>• {c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="w-full sm:w-56">
                      <label className="mb-1 block text-[11px] font-medium text-muted">
                        RubricSet 연결
                      </label>
                      <select
                        value={q.mappedRubric?.id ?? ""}
                        disabled={busy === `map-${q.id}` || rubricSets.length === 0}
                        onChange={(e) => {
                          if (e.target.value) void mapQuestion(q.id, e.target.value);
                        }}
                        className={`w-full rounded-lg border px-2 py-2 text-sm ${
                          isMissing && !q.mappedRubric
                            ? "border-red-300 bg-white font-medium text-red-800"
                            : "border-border bg-background"
                        }`}
                      >
                        <option value="">— 선택 —</option>
                        {rubricSets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.rubricName}
                            {s.organization ? ` (${s.organization.name})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </article>
              );
            })}
            {filteredQuestions.length === 0 && (
              <p className="px-6 py-12 text-center text-sm text-muted">표시할 질문이 없습니다.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200/60 bg-emerald-50/40"
      : tone === "bad"
        ? "border-red-200/60 bg-red-50/40"
        : "border-border bg-background/60";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  description,
  busy,
  onClick,
  href,
}: {
  icon: typeof Download;
  label: string;
  description: string;
  busy?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "flex w-full items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition hover:border-accent/30 hover:bg-accent/5";
  const inner = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      {busy && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted" />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" disabled={busy} onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function RubricCard({ set }: { set: RubricSet }) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        set.isDefault ? "border-accent/40 bg-accent/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-foreground">{set.rubricName}</h4>
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
      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
        {set.details.map((d) => (
          <li key={d.id} className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent">
                {d.scoreLevel}
              </span>
              {d.levelName}
            </div>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted">
              {d.behavioralIndicator}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">연결 문항 {set._count?.questionMappings ?? 0}개</p>
    </article>
  );
}

function RubricForm({
  form,
  orgs,
  busy,
  onChange,
  onSave,
  onCancel,
}: {
  form: {
    rubricName: string;
    scoringSystem: RubricSet["scoringSystem"];
    organizationId: string;
    isDefault: boolean;
    details: Array<{ scoreLevel: number; levelName: string; behavioralIndicator: string }>;
  };
  orgs: OrgOption[];
  busy: boolean;
  onChange: React.Dispatch<React.SetStateAction<typeof form>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/15 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          placeholder="루브릭 이름"
          value={form.rubricName}
          onChange={(e) => onChange((f) => ({ ...f, rubricName: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={form.scoringSystem}
          onChange={(e) => {
            const scoringSystem = e.target.value as RubricSet["scoringSystem"];
            onChange((f) => ({
              ...f,
              scoringSystem,
              details: defaultScoreLevels(scoringSystem).map((scoreLevel) => {
                const existing = f.details.find((d) => d.scoreLevel === scoreLevel);
                return existing ?? { scoreLevel, levelName: "", behavioralIndicator: "" };
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
          onChange={(e) => onChange((f) => ({ ...f, organizationId: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">플랫폼 공통</option>
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
            onChange={(e) => onChange((f) => ({ ...f, isDefault: e.target.checked }))}
          />
          기본 루브릭
        </label>
      </div>
      <div className="mt-4 space-y-2">
        {form.details.map((d, idx) => (
          <div key={d.scoreLevel} className="grid gap-2 sm:grid-cols-[64px_100px_1fr]">
            <span className="flex items-center text-sm font-semibold tabular-nums">{d.scoreLevel}점</span>
            <input
              placeholder="레벨명"
              value={d.levelName}
              onChange={(e) => {
                const details = [...form.details];
                details[idx] = { ...details[idx], levelName: e.target.value };
                onChange((f) => ({ ...f, details }));
              }}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
            <input
              placeholder="행동 지표 · 채점 기준"
              value={d.behavioralIndicator}
              onChange={(e) => {
                const details = [...form.details];
                details[idx] = { ...details[idx], behavioralIndicator: e.target.value };
                onChange((f) => ({ ...f, details }));
              }}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm">
          취소
        </button>
      </div>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-14 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
