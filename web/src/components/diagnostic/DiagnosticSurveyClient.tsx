"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DIAGNOSTIC_CONSENT_TEXT } from "@/lib/diagnostic/constants";
import { QuestionFocus } from "./survey/QuestionFocus";
import { SurveyCard, SurveyStage } from "./survey/SurveyStage";
import {
  choiceList,
  flattenSurveyQuestions,
  isQuestionComplete,
  SECTION_BLURB,
  type AnswerMap,
  type FlatQuestion,
  type SurveyItem,
  type SurveyPayload,
} from "./survey/types";

type Props = {
  waveSlug: string;
  teamSlug?: string;
};

type Phase =
  | { kind: "welcome" }
  | { kind: "demographics" }
  | { kind: "sectionIntro"; sectionCode: string; sectionName: string }
  | { kind: "question"; qIndex: number }
  | { kind: "consent" }
  | { kind: "done" };

const fetchOpts: RequestInit = { credentials: "same-origin" };

export function DiagnosticSurveyClient({ waveSlug, teamSlug }: Props) {
  const surveyBase = teamSlug
    ? `/api/diagnosis/w/${waveSlug}/t/${teamSlug}`
    : `/api/diagnosis/w/${waveSlug}`;

  const [data, setData] = useState<SurveyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "welcome" });
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [demographics, setDemographics] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demographicItems = useMemo(() => {
    if (!data) return [];
    return data.sections.flatMap((s) => s.directItems.filter((i) => i.isDemographic));
  }, [data]);

  const surveySections = useMemo(() => {
    if (!data) return [];
    return data.sections.filter((s) => s.code !== "DM");
  }, [data]);

  const questions = useMemo(
    () => flattenSurveyQuestions(data?.sections ?? []),
    [data?.sections],
  );

  const needsDemographics = useMemo(() => {
    if (!data || demographicItems.length === 0) return false;
    return !data.response?.demographics || Object.keys(data.response.demographics).length === 0;
  }, [data, demographicItems.length]);

  const progressPct = useMemo(() => {
    if (phase.kind === "done") return 100;
    if (phase.kind === "welcome") return 0;
    if (phase.kind === "demographics") return 4;
    if (phase.kind === "consent") return 98;
    if (questions.length === 0) return 10;
    if (phase.kind === "sectionIntro") {
      const first = questions.findIndex((q) => q.sectionCode === phase.sectionCode);
      return 6 + (Math.max(0, first) / questions.length) * 90;
    }
    if (phase.kind === "question") {
      return 6 + ((phase.qIndex + 0.5) / questions.length) * 90;
    }
    return 0;
  }, [phase, questions]);

  const stepLabel = useMemo(() => {
    if (phase.kind === "welcome") return "시작";
    if (phase.kind === "demographics") return "기본 정보";
    if (phase.kind === "sectionIntro") return phase.sectionName;
    if (phase.kind === "consent") return "동의 · 제출";
    if (phase.kind === "done") return "완료";
    if (phase.kind === "question") {
      const q = questions[phase.qIndex];
      return q ? `${q.sectionName} · ${phase.qIndex + 1}/${questions.length}` : "문항";
    }
    return "";
  }, [phase, questions]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const postRes = await fetch(surveyBase, { method: "POST", ...fetchOpts });
      const postJson = (await postRes.json().catch(() => ({}))) as { error?: string };
      if (!postRes.ok) throw new Error(postJson.error ?? "응답 세션을 시작하지 못했습니다.");

      const res = await fetch(surveyBase, fetchOpts);
      const json = (await res.json()) as SurveyPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "불러오기 실패");
      setData(json);
      setAnswers(json.response?.answers ?? {});
      setDemographics((json.response?.demographics as Record<string, string>) ?? {});

      if (json.response?.submittedAt) {
        setPhase({ kind: "done" });
      } else {
        setPhase({ kind: "welcome" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [surveyBase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const setNumeric = (itemId: string, axis: "current" | "importance", value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [axis]: value },
    }));
  };

  const buildAnswerPayload = (items: SurveyItem[]) =>
    items.flatMap((item) => {
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

  const persist = async (opts: {
    items?: SurveyItem[];
    submit?: boolean;
    includeDemographics?: boolean;
  } = {}) => {
    const { items = [], submit = false, includeDemographics = false } = opts;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis/respond", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waveSlug,
          ...(teamSlug ? { teamSlug } : {}),
          answers: buildAnswerPayload(items),
          demographics: includeDemographics || submit ? demographics : undefined,
          consent: submit ? consent : undefined,
          submit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      return json as { submittedAt?: string };
    } finally {
      setSaving(false);
    }
  };

  const enterSurveyFlow = () => {
    if (needsDemographics) setPhase({ kind: "demographics" });
    else if (surveySections[0]) {
      setPhase({
        kind: "sectionIntro",
        sectionCode: surveySections[0].code,
        sectionName: surveySections[0].nameKo,
      });
    } else setError("활성화된 진단 영역이 없습니다.");
  };

  const startSectionQuestions = (sectionCode: string) => {
    const idx = questions.findIndex((q) => q.sectionCode === sectionCode);
    if (idx < 0) {
      setPhase({ kind: "consent" });
      return;
    }
    setPhase({ kind: "question", qIndex: idx });
  };

  const goToQuestion = (qIndex: number) => {
    if (qIndex < 0) return;
    if (qIndex >= questions.length) {
      setPhase({ kind: "consent" });
      return;
    }
    const curr = questions[qIndex];
    const prev = qIndex > 0 ? questions[qIndex - 1] : null;
    if (!prev || prev.sectionCode === curr.sectionCode) {
      setPhase({ kind: "question", qIndex });
      return;
    }
    setPhase({
      kind: "sectionIntro",
      sectionCode: curr.sectionCode,
      sectionName: curr.sectionName,
    });
  };

  const advanceFromQuestion = async (q: FlatQuestion, qIndex: number) => {
    if (!isQuestionComplete(q.item, answers[q.item.id])) {
      setError(
        q.item.hasImportanceAxis
          ? "현재 수준과 중요도를 모두 선택해 주세요."
          : "응답을 선택해 주세요.",
      );
      return;
    }
    setError(null);
    try {
      await persist({ items: [q.item] });
      goToQuestion(qIndex + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류");
    }
  };

  const tryAutoAdvance = (item: SurveyItem, qIndex: number, nextAnswers: AnswerMap) => {
    if (item.scaleType === "OPEN_TEXT") return;
    if (!isQuestionComplete(item, nextAnswers[item.id])) return;
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await persist({ items: [item] });
          goToQuestion(qIndex + 1);
        } catch (e) {
          setError(e instanceof Error ? e.message : "저장 중 오류");
        }
      })();
    }, 380);
  };

  const onScaleChange = (
    itemId: string,
    axis: "current" | "importance",
    value: number,
    item: SurveyItem,
    qIndex: number,
  ) => {
    setAnswers((prev) => {
      const next = { ...prev, [itemId]: { ...prev[itemId], [axis]: value } };
      tryAutoAdvance(item, qIndex, next);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="dx-stage dx-stage--solo">
        <div className="dx-stage__aurora" aria-hidden />
        <p className="dx-loading">설문을 준비하는 중…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dx-stage dx-stage--solo">
        <p className="text-center text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  if (phase.kind === "done" || data.response?.submittedAt) {
    return (
      <div className="dx-stage">
        <div className="dx-stage__aurora" aria-hidden />
        <div className="dx-stage__inner">
          <SurveyCard cardKey="done">
            <div className="dx-done">
              <motion.div
                className="dx-done__mark"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                ✓
              </motion.div>
              <p className="dx-eyebrow">Thank you</p>
              <h1 className="dx-done__title">응답이 안전하게 제출되었습니다</h1>
              <p className="dx-done__body">
                소중한 시간을 내어 주셔서 감사합니다. 결과는 익명·집계 형태로만 활용되며,
                개인을 식별할 수 있는 보고는 이루어지지 않습니다.
              </p>
            </div>
          </SurveyCard>
        </div>
      </div>
    );
  }

  const meta = [
    data.team?.name ?? "조직 전체",
    data.wave.label,
    data.wave.estimatedMinutes ? `약 ${data.wave.estimatedMinutes}분` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SurveyStage
      progress={progressPct}
      stepLabel={stepLabel}
      brandTitle={phase.kind === "welcome" ? data.instrument.nameKo : undefined}
      meta={phase.kind === "welcome" ? meta : undefined}
    >
      {error && (
        <p className="mb-3 text-center text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      {phase.kind === "welcome" && (
        <SurveyCard cardKey="welcome" className="dx-card--hero">
          <p className="dx-eyebrow">Focus Assessment</p>
          <h1 className="dx-hero__title">{data.instrument.nameKo}</h1>
          <p className="dx-hero__lead">
            한 문항씩, 집중해서 답해 주세요. 맞고 틀린 답은 없습니다 — 조직의 발전을 위한
            솔직한 경험이 가장 가치 있습니다.
          </p>
          <ul className="dx-hero__bullets">
            <li>완전 익명 · N&lt;5 비공개</li>
            <li>개인 인사 평가에 사용하지 않음</li>
            <li>중요도 문항은 개선 우선순위 파악에만 사용</li>
          </ul>
          <button type="button" className="dx-btn-primary" onClick={enterSurveyFlow}>
            시작하기
          </button>
        </SurveyCard>
      )}

      {phase.kind === "demographics" && (
        <SurveyCard cardKey="dm">
          <p className="dx-eyebrow">About you</p>
          <h2 className="dx-card__title">기본 정보</h2>
          <p className="dx-card__lead">분석 단위를 나눌 때만 사용되며, 개인을 특정하지 않습니다.</p>
          <div className="dx-dm-list">
            {demographicItems.map((item) => (
              <DemographicChips
                key={item.id}
                item={item}
                value={demographics[item.itemCode] ?? ""}
                onChange={(v) => setDemographics((d) => ({ ...d, [item.itemCode]: v }))}
              />
            ))}
          </div>
          <button
            type="button"
            className="dx-btn-primary"
            disabled={saving}
            onClick={() => {
              void (async () => {
                const missing = demographicItems.filter((item) => !demographics[item.itemCode]?.trim());
                if (missing.length > 0) {
                  setError("기본 정보 항목을 모두 선택해 주세요.");
                  return;
                }
                try {
                  await persist({ includeDemographics: true });
                  if (surveySections[0]) {
                    setPhase({
                      kind: "sectionIntro",
                      sectionCode: surveySections[0].code,
                      sectionName: surveySections[0].nameKo,
                    });
                  } else setPhase({ kind: "consent" });
                } catch (e) {
                  setError(e instanceof Error ? e.message : "저장 중 오류");
                }
              })();
            }}
          >
            {saving ? "저장 중…" : "본 설문으로"}
          </button>
        </SurveyCard>
      )}

      {phase.kind === "sectionIntro" && (
        <SurveyCard cardKey={`intro-${phase.sectionCode}`} className="dx-card--chapter">
          <p className="dx-eyebrow">{phase.sectionCode}</p>
          <h2 className="dx-chapter__title">{phase.sectionName}</h2>
          <p className="dx-chapter__body">
            {SECTION_BLURB[phase.sectionCode] ?? "이 영역의 문항에 응답해 주세요."}
          </p>
          <button
            type="button"
            className="dx-btn-primary"
            onClick={() => startSectionQuestions(phase.sectionCode)}
          >
            문항 시작
          </button>
        </SurveyCard>
      )}

      {phase.kind === "question" && questions[phase.qIndex] && (
        <SurveyCard cardKey={`q-${questions[phase.qIndex].item.id}`}>
          <QuestionFocus
            item={questions[phase.qIndex].item}
            value={answers[questions[phase.qIndex].item.id]}
            subscaleName={questions[phase.qIndex].subscaleName}
            onChange={(id, axis, v) =>
              onScaleChange(id, axis, v, questions[phase.qIndex].item, phase.qIndex)
            }
            onText={(text) =>
              setAnswers((prev) => ({
                ...prev,
                [questions[phase.qIndex].item.id]: {
                  ...prev[questions[phase.qIndex].item.id],
                  text,
                },
              }))
            }
          />
          <div className="dx-nav">
            <button
              type="button"
              className="dx-btn-ghost"
              disabled={phase.qIndex === 0 && !needsDemographics}
              onClick={() => {
                if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
                if (phase.qIndex === 0) {
                  setPhase(
                    needsDemographics
                      ? { kind: "demographics" }
                      : { kind: "welcome" },
                  );
                  return;
                }
                const prevQ = questions[phase.qIndex - 1];
                const curr = questions[phase.qIndex];
                if (prevQ.sectionCode !== curr.sectionCode) {
                  setPhase({
                    kind: "sectionIntro",
                    sectionCode: curr.sectionCode,
                    sectionName: curr.sectionName,
                  });
                } else {
                  setPhase({ kind: "question", qIndex: phase.qIndex - 1 });
                }
              }}
            >
              이전
            </button>
            <button
              type="button"
              className="dx-btn-primary"
              disabled={saving}
              onClick={() => void advanceFromQuestion(questions[phase.qIndex], phase.qIndex)}
            >
              {saving ? "저장 중…" : phase.qIndex >= questions.length - 1 ? "제출 준비" : "다음"}
            </button>
          </div>
        </SurveyCard>
      )}

      {phase.kind === "consent" && (
        <SurveyCard cardKey="consent">
          <p className="dx-eyebrow">Almost done</p>
          <h2 className="dx-card__title">동의 후 제출</h2>
          <label className="dx-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{DIAGNOSTIC_CONSENT_TEXT}</span>
          </label>
          <div className="dx-nav">
            <button
              type="button"
              className="dx-btn-ghost"
              onClick={() => setPhase({ kind: "question", qIndex: Math.max(0, questions.length - 1) })}
            >
              이전
            </button>
            <button
              type="button"
              className="dx-btn-primary"
              disabled={saving || !consent}
              onClick={() => {
                void (async () => {
                  try {
                    const allItems = questions.map((q) => q.item);
                    const json = await persist({
                      items: allItems,
                      submit: true,
                      includeDemographics: true,
                    });
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            response: {
                              demographics,
                              consentAt: new Date().toISOString(),
                              submittedAt: json.submittedAt ?? new Date().toISOString(),
                              answers,
                            },
                          }
                        : prev,
                    );
                    setPhase({ kind: "done" });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "제출 중 오류");
                  }
                })();
              }}
            >
              {saving ? "제출 중…" : "제출하기"}
            </button>
          </div>
        </SurveyCard>
      )}
    </SurveyStage>
  );
}

function DemographicChips({
  item,
  value,
  onChange,
}: {
  item: SurveyItem;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = choiceList(item);
  return (
    <div className="dx-dm">
      <p className="dx-dm__label">{item.textKo}</p>
      {options.length > 0 ? (
        <div className="dx-chips" role="listbox" aria-label={item.textKo}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={value === o}
              className={`dx-chip ${value === o ? "dx-chip--on" : ""}`}
              onClick={() => onChange(o)}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <input
          className="dx-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
