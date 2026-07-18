"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AdminScenario = {
  id: string;
  code: string;
  kind: "ROLE_PLAY" | "IN_BASKET";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  titleKo: string;
  roleContext: string | null;
  taskBrief: string;
  reportKindLabel: string;
  durationMinutes: number;
  recommendedSequence: string | null;
  isActive: boolean;
  personaName: string | null;
  personaRole: string | null;
  personaProfile: string | null;
  openingLine: string | null;
  maxTurns: number;
  sourceId: string | null;
  competencies: Array<{
    id: string;
    competencyId: string | null;
    rubricSetId: string | null;
    competencyCode: string;
    nameKo: string;
    definition: string;
    subskills: Array<{
      code: string;
      nameKo: string;
      definition: string;
      indicators: Array<{
        code: string;
        polarity: "POSITIVE" | "NEGATIVE_OR_MISSING";
        textKo: string;
      }>;
    }>;
  }>;
  items: Array<{
    id: string;
    fromLabel: string;
    subject: string;
    body: string;
    urgency: string;
    importance: string;
    isDistractor: boolean;
    targetCompetencyCode: string | null;
  }>;
};

type BankCompetency = {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
};

type RubricSetOption = {
  id: string;
  rubricName: string;
  isDefault: boolean;
};

export function AssessmentScenarioStudio() {
  const [scenarios, setScenarios] = useState<AdminScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bankCompetencies, setBankCompetencies] = useState<BankCompetency[]>([]);
  const [rubricOptions, setRubricOptions] = useState<RubricSetOption[]>([]);
  const [modes, setModes] = useState({ rolePlay: true, inBasket: false });
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);

  const selected = useMemo(
    () => scenarios.find((s) => s.id === selectedId) ?? null,
    [scenarios, selectedId],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/assessment-scenarios");
      const data = (await res.json()) as { scenarios?: AdminScenario[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "목록 로드 실패");
      setScenarios(data.scenarios ?? []);
      if (selectedId && !(data.scenarios ?? []).some((s) => s.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/content-bank");
        const data = (await res.json()) as {
          competencies?: BankCompetency[];
        };
        if (res.ok && Array.isArray(data.competencies)) {
          setBankCompetencies(
            data.competencies.map((c) => ({
              id: c.id,
              code: c.code,
              nameKo: c.nameKo,
              description: c.description ?? null,
            })),
          );
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected?.competencies[0]?.competencyId) {
      setRubricOptions([]);
      return;
    }
    const competencyId = selected.competencies[0].competencyId;
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/repository/rubric-sets?competencyId=${encodeURIComponent(competencyId)}`,
        );
        const data = (await res.json()) as {
          rubricSets?: RubricSetOption[];
        };
        if (res.ok) setRubricOptions(data.rubricSets ?? []);
      } catch {
        setRubricOptions([]);
      }
    })();
  }, [selected?.competencies]);

  async function uploadAndGenerate(file: File) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const parseRes = await fetch("/api/admin/assessment-scenarios/parse", {
        method: "POST",
        body: form,
      });
      const parseData = (await parseRes.json()) as {
        source?: { id: string; extractedTextPreview: string };
        error?: string;
      };
      if (!parseRes.ok || !parseData.source) {
        throw new Error(parseData.error ?? "문서 파싱 실패");
      }
      setSourcePreview(parseData.source.extractedTextPreview);

      const modeList: string[] = [];
      if (modes.rolePlay) modeList.push("ROLE_PLAY");
      if (modes.inBasket) modeList.push("IN_BASKET");
      if (modeList.length === 0) modeList.push("ROLE_PLAY");

      const genRes = await fetch("/api/admin/assessment-scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: parseData.source.id, modes: modeList }),
      });
      const genData = (await genRes.json()) as {
        scenarios?: AdminScenario[];
        error?: string;
        details?: string[];
      };
      if (!genRes.ok) {
        throw new Error(
          genData.error ??
            (genData.details?.join("; ") || "초안 생성 실패"),
        );
      }
      setMessage(`${genData.scenarios?.length ?? 0}개 초안을 생성했습니다. 검토 후 게시하세요.`);
      await refresh();
      if (genData.scenarios?.[0]) setSelectedId(genData.scenarios[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드/생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveSelected(patch: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/assessment-scenarios/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { scenario?: AdminScenario; error?: string };
      if (!res.ok || !data.scenario) throw new Error(data.error ?? "저장 실패");
      setScenarios((list) =>
        list.map((s) => (s.id === data.scenario!.id ? data.scenario! : s)),
      );
      setMessage("저장했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function publishSelected(unpublish = false) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/assessment-scenarios/${selected.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unpublish }),
      });
      const data = (await res.json()) as {
        scenario?: AdminScenario;
        error?: string;
        issues?: Array<{ message: string }>;
      };
      if (!res.ok || !data.scenario) {
        const issueText = data.issues?.map((i) => i.message).join(" · ");
        throw new Error(issueText || data.error || "게시 실패");
      }
      setScenarios((list) =>
        list.map((s) => (s.id === data.scenario!.id ? data.scenario! : s)),
      );
      setMessage(unpublish ? "게시를 취소했습니다." : "게시했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "게시 실패");
    } finally {
      setBusy(false);
    }
  }

  async function linkCompetency(competencyId: string) {
    if (!selected) return;
    const bank = bankCompetencies.find((c) => c.id === competencyId);
    if (!bank) return;
    const existing = selected.competencies.map((c) => ({
      competencyId: c.competencyId ?? "",
      rubricSetId: c.rubricSetId,
      subskills: c.subskills,
    })).filter((c) => c.competencyId);
    if (!existing.some((c) => c.competencyId === competencyId)) {
      existing.push({
        competencyId,
        rubricSetId: null,
        subskills: [
          {
            code: "CORE",
            nameKo: "핵심 행동",
            definition: `${bank.nameKo} 핵심 관찰 영역`,
            indicators: [
              {
                code: "P1",
                polarity: "POSITIVE",
                textKo: `${bank.nameKo} 관련 긍정 행동이 명확히 나타난다.`,
              },
              {
                code: "N1",
                polarity: "NEGATIVE_OR_MISSING",
                textKo: `${bank.nameKo} 관련 행동이 관찰되지 않거나 부정적으로 나타난다.`,
              },
            ],
          },
        ],
      });
    }
    await saveSelected({ competencyLinks: existing });
  }

  async function setRubricForFirst(rubricSetId: string) {
    if (!selected?.competencies[0]?.competencyId) return;
    const links = selected.competencies
      .filter((c) => c.competencyId)
      .map((c, index) => ({
        competencyId: c.competencyId!,
        rubricSetId: index === 0 ? rubricSetId : c.rubricSetId,
        subskills: c.subskills,
      }));
    await saveSelected({ competencyLinks: links });
  }

  async function seedDemoScenarios() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/assessment-scenarios/seed-demo", {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        scenarios?: string[];
      };
      if (!res.ok) throw new Error(data.error ?? "데모 시드 실패");
      setMessage(
        data.message ??
          `데모 과제 시드 완료${data.scenarios?.length ? `: ${data.scenarios.join(", ")}` : ""}`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "데모 시드 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-dashed border-amber-300/60 bg-amber-50/40 p-5 dark:bg-amber-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">데모 과제 시드</h2>
            <p className="mt-1 text-xs text-muted">
              기존 샘플 2종을 게시 상태로 동기화합니다. 역할연기「저성과 팀원과의 면담」,
              서류함「신임 팀장의 월요일 아침 서류함」.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void seedDemoScenarios()}
            className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? "시드 중…" : "데모 과제 넣기"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-card-border bg-card/40 p-5">
        <h2 className="text-sm font-semibold text-foreground">1. 과제 문서 업로드 → AI 초안</h2>
        <p className="mt-1 text-xs text-muted">
          PDF/DOC/DOCX/TXT/MD (최대 5MB). 초안은 DRAFT로 저장되며 검토 후 게시해야 응시 가능합니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={modes.rolePlay}
              onChange={(e) => setModes((m) => ({ ...m, rolePlay: e.target.checked }))}
            />
            역할연기
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={modes.inBasket}
              onChange={(e) => setModes((m) => ({ ...m, inBasket: e.target.checked }))}
            />
            서류함
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAndGenerate(file);
              e.target.value = "";
            }}
            className="text-xs"
          />
        </div>
        {sourcePreview ? (
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-background/80 p-3 text-xs text-muted whitespace-pre-wrap">
            {sourcePreview}
          </pre>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="rounded-xl border border-card-border bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">과제 목록</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
              className="text-xs text-accent hover:underline"
            >
              새로고침
            </button>
          </div>
          {loading ? (
            <p className="p-3 text-xs text-muted">불러오는 중…</p>
          ) : scenarios.length === 0 ? (
            <p className="p-3 text-xs text-muted">
              등록된 과제가 없습니다. 위의 「데모 과제 넣기」로 샘플을 시드하세요.
            </p>
          ) : (
            <ul className="max-h-[36rem] space-y-1 overflow-y-auto">
              {scenarios.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      selectedId === s.id ? "bg-foreground text-background" : "hover:bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{s.titleKo}</span>
                      <span className="text-[10px] opacity-80">{s.status}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] opacity-70">
                      {s.kind === "IN_BASKET" ? "서류함" : "역할연기"} · v{s.version} · {s.code}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-card-border bg-card/40 p-5">
          {!selected ? (
            <p className="text-sm text-muted">왼쪽에서 과제를 선택하세요.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">
                    {selected.code} · {selected.status} · v{selected.version}
                  </p>
                  <input
                    className="mt-1 w-full max-w-xl rounded-lg border border-card-border bg-background px-3 py-2 text-lg font-semibold"
                    value={selected.titleKo}
                    onChange={(e) =>
                      setScenarios((list) =>
                        list.map((s) =>
                          s.id === selected.id ? { ...s, titleKo: e.target.value } : s,
                        ),
                      )
                    }
                    onBlur={() => void saveSelected({ titleKo: selected.titleKo })}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveSelected({
                      titleKo: selected.titleKo,
                      taskBrief: selected.taskBrief,
                      roleContext: selected.roleContext,
                      recommendedSequence: selected.recommendedSequence,
                      durationMinutes: selected.durationMinutes,
                      maxTurns: selected.maxTurns,
                      personaName: selected.personaName,
                      personaRole: selected.personaRole,
                      personaProfile: selected.personaProfile,
                      openingLine: selected.openingLine,
                      items:
                        selected.kind === "IN_BASKET"
                          ? selected.items.map((item) => ({
                              fromLabel: item.fromLabel,
                              subject: item.subject,
                              body: item.body,
                              urgency: item.urgency as "LOW" | "MEDIUM" | "HIGH",
                              importance: item.importance as "LOW" | "MEDIUM" | "HIGH",
                              isDistractor: item.isDistractor,
                              targetCompetencyCode: item.targetCompetencyCode,
                            }))
                          : undefined,
                    })}
                    className="rounded-lg border border-card-border px-3 py-1.5 text-xs"
                  >
                    저장
                  </button>
                  {selected.status === "PUBLISHED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void publishSelected(true)}
                      className="rounded-lg border border-card-border px-3 py-1.5 text-xs"
                    >
                      게시 취소
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || selected.status === "ARCHIVED"}
                      onClick={() => void publishSelected(false)}
                      className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                    >
                      게시
                    </button>
                  )}
                </div>
              </div>

              <label className="block text-xs font-medium">
                과제 브리핑
                <textarea
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                  rows={4}
                  value={selected.taskBrief}
                  onChange={(e) =>
                    setScenarios((list) =>
                      list.map((s) =>
                        s.id === selected.id ? { ...s, taskBrief: e.target.value } : s,
                      ),
                    )
                  }
                />
              </label>

              {selected.kind === "ROLE_PLAY" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium">
                    상대역 이름
                    <input
                      className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                      value={selected.personaName ?? ""}
                      onChange={(e) =>
                        setScenarios((list) =>
                          list.map((s) =>
                            s.id === selected.id
                              ? { ...s, personaName: e.target.value }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    최대 턴
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                      value={selected.maxTurns}
                      onChange={(e) =>
                        setScenarios((list) =>
                          list.map((s) =>
                            s.id === selected.id
                              ? { ...s, maxTurns: Number(e.target.value) || 6 }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium sm:col-span-2">
                    첫 발화
                    <textarea
                      className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                      rows={2}
                      value={selected.openingLine ?? ""}
                      onChange={(e) =>
                        setScenarios((list) =>
                          list.map((s) =>
                            s.id === selected.id
                              ? { ...s, openingLine: e.target.value }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium sm:col-span-2">
                    페르소나 지침 (응시자 비공개)
                    <textarea
                      className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                      rows={4}
                      value={selected.personaProfile ?? ""}
                      onChange={(e) =>
                        setScenarios((list) =>
                          list.map((s) =>
                            s.id === selected.id
                              ? { ...s, personaProfile: e.target.value }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold">서류함 항목 ({selected.items.length})</h3>
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {selected.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-card-border bg-background/60 p-3 text-xs"
                      >
                        <p className="font-medium">
                          {idx + 1}. {item.subject}
                          {item.isDistractor ? " · 미끼" : ""}
                        </p>
                        <p className="mt-1 text-muted">{item.fromLabel}</p>
                        <p className="mt-1 line-clamp-3 text-muted">{item.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2 border-t border-card-border pt-4">
                <h3 className="text-xs font-semibold">역량 · 루브릭 · 행동지표</h3>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id) void linkCompetency(id);
                      e.target.value = "";
                    }}
                  >
                    <option value="">플랫폼 역량 추가…</option>
                    {bankCompetencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.nameKo}
                      </option>
                    ))}
                  </select>
                  {rubricOptions.length > 0 ? (
                    <select
                      className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs"
                      value={selected.competencies[0]?.rubricSetId ?? ""}
                      onChange={(e) => {
                        if (e.target.value) void setRubricForFirst(e.target.value);
                      }}
                    >
                      <option value="">첫 역량 루브릭 선택…</option>
                      {rubricOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.rubricName}
                          {r.isDefault ? " (기본)" : ""}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <ul className="space-y-2">
                  {selected.competencies.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-card-border bg-background/60 p-3 text-xs"
                    >
                      <p className="font-medium">
                        {c.competencyCode} · {c.nameKo}
                        {!c.competencyId ? " (미연결)" : ""}
                        {c.rubricSetId ? " · 루브릭 연결됨" : " · 루브릭 미지정"}
                      </p>
                      <p className="mt-1 text-muted">
                        하위역량 {c.subskills.length} · 행동지표{" "}
                        {c.subskills.reduce((n, s) => n + s.indicators.length, 0)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
