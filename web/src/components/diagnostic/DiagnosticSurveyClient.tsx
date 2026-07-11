"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ANONYMITY_BANNER, DIAGNOSTIC_CONSENT_TEXT } from "@/lib/diagnostic/constants";

type ScaleType = "AGREEMENT_5" | "RETRO_CHANGE_5" | "SPEED_5" | "OPEN_TEXT";

type SurveyItem = {
  id: string;
  itemCode: string;
  textKo: string;
  scaleType: ScaleType;
  scaleLabels: string[] | null;
  hasImportanceAxis: boolean;
  isDemographic: boolean;
  choiceOptions: unknown;
};

type SurveySection = {
  code: string;
  nameKo: string;
  subscales: Array<{ code: string; nameKo: string; items: SurveyItem[] }>;
  directItems: SurveyItem[];
};

type SurveyPayload = {
  wave: { id: string; label: string | null; status: string; estimatedMinutes: number | null };
  team: { id: string; name: string } | null;
  instrument: { nameKo: string; version: string };
  sections: SurveySection[];
  response: {
    demographics: Record<string, string> | null;
    consentAt: string | null;
    submittedAt: string | null;
    answers: Record<string, { current?: number; importance?: number; text?: string }>;
  } | null;
};

type FlowStep =
  | { kind: "demographics" }
  | { kind: "section"; section: SurveySection }
  | { kind: "done" };

type Props = {
  waveSlug: string;
  teamSlug?: string;
};

const fetchOpts: RequestInit = { credentials: "same-origin" };

export function DiagnosticSurveyClient({ waveSlug, teamSlug }: Props) {
  const surveyBase = teamSlug
    ? `/api/diagnosis/w/${waveSlug}/t/${teamSlug}`
    : `/api/diagnosis/w/${waveSlug}`;
  const [data, setData] = useState<SurveyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { current?: number; importance?: number; text?: string }>>({});
  const [demographics, setDemographics] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const demographicItems = useMemo(() => {
    if (!data) return [];
    return data.sections.flatMap((s) => s.directItems.filter((i) => i.isDemographic));
  }, [data]);

  const surveySections = useMemo(() => {
    if (!data) return [];
    return data.sections.filter((s) => s.code !== "DM");
  }, [data]);

  const flowSteps = useMemo((): FlowStep[] => {
    if (!data) return [];
    if (data.response?.submittedAt) return [{ kind: "done" }];

    const steps: FlowStep[] = [];
    const needsDemographics =
      demographicItems.length > 0 &&
      (!data.response?.demographics || Object.keys(data.response.demographics).length === 0);
    if (needsDemographics) steps.push({ kind: "demographics" });
    for (const section of surveySections) {
      steps.push({ kind: "section", section });
    }
    return steps;
  }, [data, demographicItems.length, surveySections]);

  const lastSectionStepIndex = useMemo(() => {
    let last = -1;
    flowSteps.forEach((step, i) => {
      if (step.kind === "section") last = i;
    });
    return last;
  }, [flowSteps]);

  const currentStep = flowSteps[stepIndex];
  const isLastSection =
    currentStep?.kind === "section" && stepIndex === lastSectionStepIndex;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const postRes = await fetch(surveyBase, { method: "POST", ...fetchOpts });
      const postJson = (await postRes.json().catch(() => ({}))) as { error?: string };
      if (!postRes.ok) {
        throw new Error(postJson.error ?? "응답 세션을 시작하지 못했습니다.");
      }

      const res = await fetch(surveyBase, fetchOpts);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "불러오기 실패");
      setData(json);
      setAnswers(json.response?.answers ?? {});
      setDemographics((json.response?.demographics as Record<string, string>) ?? {});
      setStepIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [surveyBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const setNumeric = (itemId: string, axis: "current" | "importance", value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [axis]: value },
    }));
  };

  const itemsForSection = (section: SurveySection) => {
    const fromSub = section.subscales.flatMap((sub) => sub.items);
    const direct = section.directItems.filter((i) => !i.isDemographic);
    return [...fromSub, ...direct];
  };

  const saveProgress = async (opts: { submit?: boolean; advance?: boolean } = {}) => {
    const { submit = false, advance = false } = opts;
    setSaving(true);
    setError(null);
    try {
      if (currentStep?.kind === "demographics" && advance) {
        const missing = demographicItems.filter((item) => !demographics[item.itemCode]?.trim());
        if (missing.length > 0) {
          throw new Error("기본 정보 항목을 모두 선택해 주세요.");
        }
      }

      const itemsToSave =
        currentStep?.kind === "section"
          ? itemsForSection(currentStep.section)
          : surveySections.flatMap(itemsForSection);

      const answerPayload = itemsToSave.flatMap((item) => {
        const a = answers[item.id];
        if (!a) return [];
        const rows: Array<{
          itemId: string;
          axis: "CURRENT" | "IMPORTANCE";
          numericValue?: number;
          textValue?: string;
        }> = [];
        if (item.scaleType === "OPEN_TEXT" && a.text) {
          rows.push({ itemId: item.id, axis: "CURRENT", textValue: a.text });
        } else if (a.current != null && a.current >= 1) {
          rows.push({ itemId: item.id, axis: "CURRENT", numericValue: a.current });
        }
        if (a.importance != null && a.importance >= 1) {
          rows.push({ itemId: item.id, axis: "IMPORTANCE", numericValue: a.importance });
        }
        return rows;
      });

      const res = await fetch("/api/diagnosis/respond", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waveSlug,
          ...(teamSlug ? { teamSlug } : {}),
          answers: answerPayload,
          demographics:
            currentStep?.kind === "demographics" || submit ? demographics : undefined,
          consent: submit ? consent : undefined,
          submit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "저장 실패");

      if (submit) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                response: {
                  ...(prev.response ?? {
                    demographics: null,
                    consentAt: null,
                    answers: {},
                  }),
                  demographics: prev.response?.demographics ?? demographics,
                  consentAt: new Date().toISOString(),
                  submittedAt: json.submittedAt ?? new Date().toISOString(),
                  answers: prev.response?.answers ?? answers,
                },
              }
            : prev,
        );
        setStepIndex(flowSteps.length);
      } else if (advance) {
        if (stepIndex >= flowSteps.length - 1) {
          throw new Error("다음 설문 영역이 없습니다. 관리자에게 문의해 주세요.");
        }
        setStepIndex((i) => i + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted">설문을 불러오는 중…</p>;
  if (error && !data) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return null;

  if (
    currentStep?.kind === "done" ||
    data.response?.submittedAt ||
    stepIndex >= flowSteps.length
  ) {
    return (
      <div className="card-luxe space-y-4 p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">응답이 제출되었습니다</h1>
        <p className="text-sm text-muted">소중한 의견 감사합니다. 결과는 팀 단위로만 집계됩니다.</p>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="card-luxe space-y-3 p-8 text-center">
        <h1 className="text-lg font-bold text-foreground">설문 구성을 불러올 수 없습니다</h1>
        <p className="text-sm text-muted">
          활성화된 진단 영역이 없습니다. 링크를 확인하거나 관리자에게 문의해 주세요.
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  const progressLabel =
    currentStep.kind === "demographics"
      ? "기본 정보"
      : `영역 ${surveySections.findIndex((s) => s.code === currentStep.section.code) + 1} / ${surveySections.length}: ${currentStep.section.nameKo}`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
        {ANONYMITY_BANNER}
      </div>

      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-gold">ARC Index</p>
        <h1 className="text-2xl font-bold text-foreground">{data.instrument.nameKo}</h1>
        <p className="text-sm text-muted">
          {data.team?.name ?? "조직 전체"}
          {data.wave.label ? ` · ${data.wave.label}` : ""}
          {data.wave.estimatedMinutes ? ` · 약 ${data.wave.estimatedMinutes}분` : ""}
        </p>
        <p className="text-xs font-medium text-gold">{progressLabel}</p>
      </header>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {currentStep.kind === "demographics" && (
        <div className="card-luxe space-y-6 p-6">
          <h2 className="font-semibold text-foreground">인구통계 (익명)</h2>
          {demographicItems.map((item) => (
            <DemographicField
              key={item.id}
              item={item}
              value={demographics[item.itemCode] ?? ""}
              onChange={(v) => setDemographics((d) => ({ ...d, [item.itemCode]: v }))}
            />
          ))}
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={() => void saveProgress({ advance: true })}
          >
            {saving ? "저장 중…" : "다음 — 본 설문"}
          </button>
        </div>
      )}

      {currentStep.kind === "section" && (
        <div className="space-y-6">
          <section className="card-luxe space-y-6 p-6">
            <h2 className="text-lg font-semibold text-foreground">{currentStep.section.nameKo}</h2>
            {currentStep.section.subscales.map((sub) => (
              <div key={sub.code} className="space-y-4">
                {currentStep.section.subscales.length > 1 && (
                  <h3 className="text-sm font-medium text-muted">{sub.nameKo}</h3>
                )}
                {sub.items.map((item) => (
                  <ScaleQuestion
                    key={item.id}
                    item={item}
                    value={answers[item.id]}
                    onChange={setNumeric}
                    onText={(text) =>
                      setAnswers((prev) => ({ ...prev, [item.id]: { ...prev[item.id], text } }))
                    }
                  />
                ))}
              </div>
            ))}
            {currentStep.section.directItems
              .filter((i) => !i.isDemographic)
              .map((item) => (
                <ScaleQuestion
                  key={item.id}
                  item={item}
                  value={answers[item.id]}
                  onChange={setNumeric}
                  onText={(text) =>
                    setAnswers((prev) => ({ ...prev, [item.id]: { ...prev[item.id], text } }))
                  }
                />
              ))}
          </section>

          {isLastSection ? (
            <div className="card-luxe space-y-4 p-6">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span className="text-muted">{DIAGNOSTIC_CONSENT_TEXT}</span>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => void saveProgress()}
                >
                  임시 저장
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving || !consent}
                  onClick={() => void saveProgress({ submit: true })}
                >
                  {saving ? "제출 중…" : "제출하기"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving || stepIndex === 0}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                이전 영역
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => void saveProgress()}
              >
                임시 저장
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void saveProgress({ advance: true })}
              >
                {saving ? "저장 중…" : "다음 영역"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DemographicField({
  item,
  value,
  onChange,
}: {
  item: SurveyItem;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = Array.isArray(item.choiceOptions)
    ? (item.choiceOptions as string[])
    : typeof item.choiceOptions === "object" && item.choiceOptions !== null
      ? Object.values(item.choiceOptions as Record<string, string>)
      : [];

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{item.textKo}</p>
      {options.length > 0 ? (
        <select
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">선택</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ScaleQuestion({
  item,
  value,
  onChange,
  onText,
}: {
  item: SurveyItem;
  value?: { current?: number; importance?: number; text?: string };
  onChange: (itemId: string, axis: "current" | "importance", v: number) => void;
  onText: (text: string) => void;
}) {
  if (item.scaleType === "OPEN_TEXT") {
    return (
      <div>
        <p className="mb-2 text-sm text-foreground">{item.textKo}</p>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          value={value?.text ?? ""}
          onChange={(e) => onText(e.target.value)}
        />
      </div>
    );
  }

  const labels = item.scaleLabels ?? ["1", "2", "3", "4", "5"];

  return (
    <div className="space-y-3 border-b border-card-border pb-4 last:border-0">
      <p className="text-sm text-foreground">{item.textKo}</p>
      <RadioRow
        label="현재 수준"
        labels={labels}
        selected={value?.current}
        onSelect={(v) => onChange(item.id, "current", v)}
      />
      {item.hasImportanceAxis && (
        <RadioRow
          label="중요도"
          labels={labels}
          selected={value?.importance}
          onSelect={(v) => onChange(item.id, "importance", v)}
        />
      )}
    </div>
  );
}

function RadioRow({
  label,
  labels,
  selected,
  onSelect,
}: {
  label: string;
  labels: string[];
  selected?: number;
  onSelect: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {labels.map((lbl, idx) => {
          const v = idx + 1;
          return (
            <button
              key={lbl}
              type="button"
              title={lbl}
              className={`rounded-lg border px-2 py-1 text-xs ${
                selected === v
                  ? "border-gold bg-gold/20 text-foreground"
                  : "border-card-border text-muted hover:border-gold/50"
              }`}
              onClick={() => onSelect(v)}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
