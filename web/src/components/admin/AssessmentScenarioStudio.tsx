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
  const [modes, setModes] = useState({ rolePlay: true, inBasket: false });
  const [sampleText, setSampleText] = useState("");
  const [guidance, setGuidance] = useState("");
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [publishIssues, setPublishIssues] = useState<string[]>([]);
  const [rubricOptionsByCompetency, setRubricOptionsByCompetency] = useState<
    Record<string, RubricSetOption[]>
  >({});
  const [candidatePreview, setCandidatePreview] = useState<string | null>(null);

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
    const ids = [
      ...new Set(
        (selected?.competencies ?? [])
          .map((c) => c.competencyId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (ids.length === 0) {
      setRubricOptionsByCompetency({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, RubricSetOption[]> = {};
      await Promise.all(
        ids.map(async (competencyId) => {
          try {
            const res = await fetch(
              `/api/admin/repository/rubric-sets?competencyId=${encodeURIComponent(competencyId)}`,
            );
            const data = (await res.json()) as { rubricSets?: RubricSetOption[] };
            if (res.ok) next[competencyId] = data.rubricSets ?? [];
          } catch {
            next[competencyId] = [];
          }
        }),
      );
      if (!cancelled) setRubricOptionsByCompetency(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.competencies]);

  useEffect(() => {
    setCandidatePreview(null);
    setPublishIssues([]);
  }, [selectedId]);

  async function createFromParsedSource(parseInit: RequestInit) {
    setBusy(true);
    setError(null);
    setMessage(null);
    setPublishIssues([]);
    try {
      const parseRes = await fetch("/api/admin/assessment-scenarios/parse", parseInit);
      const parseData = (await parseRes.json()) as {
        source?: { id: string; extractedTextPreview: string };
        error?: string;
      };
      if (!parseRes.ok || !parseData.source) {
        throw new Error(parseData.error ?? "샘플 등록 실패");
      }
      setSourcePreview(parseData.source.extractedTextPreview);

      const modeList: string[] = [];
      if (modes.rolePlay) modeList.push("ROLE_PLAY");
      if (modes.inBasket) modeList.push("IN_BASKET");
      if (modeList.length === 0) modeList.push("ROLE_PLAY");

      const genRes = await fetch("/api/admin/assessment-scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: parseData.source.id,
          modes: modeList,
          guidance: guidance.trim() || undefined,
        }),
      });
      const genData = (await genRes.json()) as {
        scenarios?: AdminScenario[];
        error?: string;
        details?: string[];
        errors?: string[];
      };
      if (!genRes.ok) {
        const detail = genData.details?.filter(Boolean).join(" · ");
        throw new Error(
          detail
            ? `${genData.error ?? "유사 과제 생성 실패"}: ${detail}`
            : genData.error ?? "유사 과제 생성 실패",
        );
      }
      if (genData.errors?.length) {
        setMessage(
          `${genData.scenarios?.length ?? 0}개 초안 생성. 일부 실패: ${genData.errors.join(" · ")}`,
        );
      } else {
        setMessage(
          `${genData.scenarios?.length ?? 0}개 초안을 만들었습니다. 아래에서 검토한 뒤 「게시」를 누르면 /assessment에 노출됩니다.`,
        );
      }
      await refresh();
      if (genData.scenarios?.[0]) setSelectedId(genData.scenarios[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "과제 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function generateFromSampleText() {
    await createFromParsedSource({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sampleText, fileName: "admin-sample.txt" }),
    });
  }

  async function uploadAndGenerate(file: File) {
    const form = new FormData();
    form.append("file", file);
    await createFromParsedSource({ method: "POST", body: form });
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

  async function publishScenario(scenarioId: string, unpublish = false) {
    setBusy(true);
    setError(null);
    setPublishIssues([]);
    try {
      const res = await fetch(`/api/admin/assessment-scenarios/${scenarioId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unpublish }),
      });
      const data = (await res.json()) as {
        scenario?: AdminScenario;
        error?: string;
        issues?: Array<{ message: string }>;
        repairs?: string[];
      };
      if (!res.ok || !data.scenario) {
        const issues = data.issues?.map((i) => i.message).filter(Boolean) ?? [];
        setPublishIssues(issues);
        throw new Error(
          issues.length > 0
            ? `게시 조건을 충족하지 않습니다.`
            : data.error || "게시 실패",
        );
      }
      setScenarios((list) =>
        list.map((s) => (s.id === data.scenario!.id ? data.scenario! : s)),
      );
      setSelectedId(data.scenario.id);
      const repairNote =
        data.repairs && data.repairs.length > 0
          ? ` (자동 보정: ${data.repairs.join(", ")})`
          : "";
      setMessage(
        unpublish
          ? "게시를 취소했습니다. 다시 DRAFT 상태입니다."
          : `게시했습니다. /assessment에 노출됩니다.${repairNote}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "게시 실패");
    } finally {
      setBusy(false);
    }
  }

  async function publishSelected(unpublish = false) {
    if (!selected) return;
    await publishScenario(selected.id, unpublish);
  }

  const readiness = useMemo(() => {
    if (!selected || selected.status === "ARCHIVED") return [];
    const rows: Array<{ ok: boolean; label: string }> = [];
    rows.push({
      ok: Boolean(selected.titleKo.trim()),
      label: "과제 제목",
    });
    rows.push({
      ok: Boolean(selected.taskBrief.trim()),
      label: "과제 브리핑",
    });
    rows.push({
      ok: selected.competencies.length > 0,
      label: "역량 1개 이상",
    });
    rows.push({
      ok: selected.competencies.every((c) => Boolean(c.competencyId)),
      label: "플랫폼 역량 연결 (게시 시 자동 보정 가능)",
    });
    rows.push({
      ok: selected.competencies.every(
        (c) => c.subskills.reduce((n, s) => n + s.indicators.length, 0) > 0,
      ),
      label: "행동지표 (게시 시 자동 보정 가능)",
    });
    if (selected.kind === "ROLE_PLAY") {
      rows.push({
        ok: Boolean(selected.personaName?.trim()),
        label: "상대역 이름",
      });
      rows.push({
        ok: Boolean(selected.openingLine?.trim()),
        label: "첫 발화",
      });
      rows.push({
        ok: Boolean(selected.personaProfile?.trim()),
        label: "연기 지침",
      });
    } else {
      rows.push({
        ok: selected.items.length >= 3,
        label: `서류함 항목 ${selected.items.length}/3+`,
      });
    }
    return rows;
  }, [selected]);

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

  async function setRubricForCompetency(competencyId: string, rubricSetId: string) {
    if (!selected) return;
    const links = selected.competencies
      .filter((c) => c.competencyId)
      .map((c) => ({
        competencyId: c.competencyId!,
        rubricSetId: c.competencyId === competencyId ? rubricSetId : c.rubricSetId,
        subskills: c.subskills,
      }));
    await saveSelected({ competencyLinks: links });
  }

  async function duplicateSelected() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/assessment-scenarios/${selected.id}/duplicate`,
        { method: "POST" },
      );
      const data = (await res.json()) as { scenario?: AdminScenario; error?: string };
      if (!res.ok || !data.scenario) throw new Error(data.error ?? "복제 실패");
      setMessage(`복제본을 만들었습니다: ${data.scenario.code}`);
      await refresh();
      setSelectedId(data.scenario.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "복제 실패");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSelected() {
    if (!selected) return;
    if (!window.confirm(`「${selected.titleKo}」을(를) 보관하시겠습니까?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/assessment-scenarios/${selected.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { scenario?: AdminScenario; error?: string };
      if (!res.ok || !data.scenario) throw new Error(data.error ?? "보관 실패");
      setScenarios((list) =>
        list.map((s) => (s.id === data.scenario!.id ? data.scenario! : s)),
      );
      setMessage("보관했습니다. 목록에서 ARCHIVED로 표시됩니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "보관 실패");
    } finally {
      setBusy(false);
    }
  }

  async function loadCandidatePreview() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/assessment-scenarios/${selected.id}/preview`,
      );
      const data = (await res.json()) as {
        preview?: {
          candidateFacing: {
            personaName: string | null;
            openingLine: string | null;
            competencies: Array<{ nameKo: string }>;
            inBasketItems: Array<{ subject: string; fromLabel: string }>;
          };
          titleKo: string;
          taskBrief: string;
          kind: string;
        };
        publishReady?: boolean;
        issues?: Array<{ message: string }>;
        error?: string;
      };
      if (!res.ok || !data.preview) throw new Error(data.error ?? "미리보기 실패");
      const cf = data.preview.candidateFacing;
      const lines = [
        `[응시자 화면 미리보기] ${data.preview.titleKo}`,
        data.preview.taskBrief,
        "",
        data.preview.kind === "ROLE_PLAY"
          ? `상대역: ${cf.personaName ?? "—"}`
          : `서류함 ${cf.inBasketItems.length}건`,
        data.preview.kind === "ROLE_PLAY" && cf.openingLine
          ? `첫 발화: ${cf.openingLine}`
          : "",
        `연결 역량: ${cf.competencies.map((c) => c.nameKo).join(", ") || "—"}`,
        data.preview.kind === "IN_BASKET"
          ? cf.inBasketItems
              .map((it, i) => `${i + 1}. ${it.subject} (${it.fromLabel})`)
              .join("\n")
          : "",
        "",
        data.publishReady
          ? "게시 가능"
          : `게시 전 보완: ${(data.issues ?? []).map((i) => i.message).join(" · ")}`,
      ].filter(Boolean);
      setCandidatePreview(lines.join("\n"));
      setMessage("응시자 관점 미리보기를 불러왔습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "미리보기 실패");
    } finally {
      setBusy(false);
    }
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
    <div className="space-y-4 sm:space-y-6">
      <section
        className={`rounded-xl border border-card-border bg-card/40 p-4 sm:p-5 ${
          selected ? "hidden lg:block" : ""
        }`}
      >
        <h2 className="text-base font-semibold text-foreground">샘플로 유사 과제 만들기</h2>
        <p className="mt-1 text-sm text-muted">
          갖고 계신 역할연기·서류함 샘플을 붙여넣으면, 구조는 비슷하고 상황·인물은 새로 짠
          초안을 DRAFT로 만듭니다. 검토 후 게시해야 `/assessment`에 노출됩니다.
        </p>

        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          disabled={busy}
          rows={8}
          placeholder={`예시)\n· 응시자 역할: 팀장\n· 상황: 성과 부진 팀원과의 1:1\n· 목표: 원인 진단 후 개선 계획 합의\n· 평가 역량: 의사소통, 리더십\n· (역할연기) 상대역 성격·첫 멘트\n· (서류함) 처리할 메일/메모 원문`}
          className="mt-4 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-base leading-relaxed sm:text-sm"
        />

        <input
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          disabled={busy}
          placeholder="추가 지시(선택): 예) 제조업 공장장 / 직급은 차장급 / 톤은 차분하게"
          className="mt-3 w-full rounded-lg border border-card-border bg-background px-3 py-2.5 text-base sm:text-sm"
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex min-h-10 items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={modes.rolePlay}
                onChange={(e) => setModes((m) => ({ ...m, rolePlay: e.target.checked }))}
              />
              역할연기
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={modes.inBasket}
                onChange={(e) => setModes((m) => ({ ...m, inBasket: e.target.checked }))}
              />
              서류함
            </label>
          </div>
          <button
            type="button"
            disabled={busy || sampleText.trim().length < 40}
            onClick={() => void generateFromSampleText()}
            className="min-h-11 w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50 sm:w-auto"
          >
            {busy ? "생성 중…" : "유사 과제 생성"}
          </button>
          <label className="min-h-10 cursor-pointer text-center text-sm text-accent hover:underline sm:text-left sm:text-xs">
            또는 문서 업로드
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              disabled={busy}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAndGenerate(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {sourcePreview ? (
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-background/80 p-3 text-xs text-muted whitespace-pre-wrap">
            {sourcePreview}
          </pre>
        ) : null}
      </section>

      <details
        className={`rounded-xl border border-dashed border-card-border bg-background/40 px-4 py-3 sm:px-5 ${
          selected ? "hidden lg:block" : ""
        }`}
      >
        <summary className="cursor-pointer text-sm font-medium text-muted">
          임시 데모 시드 (김대리·서류함 샘플)
        </summary>
        <div className="mt-3 flex flex-col gap-3 pb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            내부 검증용입니다. 실제 과제는 위 샘플 생성으로 만드는 것을 권장합니다.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void seedDemoScenarios()}
            className="btn-secondary min-h-10 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {busy ? "시드 중…" : "데모 넣기"}
          </button>
        </div>
      </details>

      {error ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p>{error}</p>
          {publishIssues.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {publishIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section
          className={`rounded-xl border border-card-border bg-card/40 p-3 ${
            selected ? "hidden lg:block" : ""
          }`}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">과제 목록</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
              className="min-h-9 text-xs text-accent hover:underline"
            >
              새로고침
            </button>
          </div>
          {loading ? (
            <p className="p-3 text-xs text-muted">불러오는 중…</p>
          ) : scenarios.length === 0 ? (
            <p className="p-3 text-xs text-muted">
              등록된 과제가 없습니다. 위에서 샘플을 붙여넣고 「유사 과제 생성」을 누르세요.
            </p>
          ) : (
            <ul className="max-h-[min(28rem,60dvh)] space-y-1 overflow-y-auto overscroll-contain lg:max-h-[36rem] [-webkit-overflow-scrolling:touch]">
              {scenarios.map((s) => (
                <li key={s.id}>
                  <div
                    className={`flex items-stretch gap-1 rounded-lg ${
                      selectedId === s.id ? "bg-foreground text-background" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`min-h-14 min-w-0 flex-1 px-3 py-2.5 text-left text-sm transition ${
                        selectedId === s.id ? "" : "rounded-lg hover:bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-2 font-medium">{s.titleKo}</span>
                        <span className="shrink-0 text-[10px] opacity-80">{s.status}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] opacity-70">
                        {s.kind === "IN_BASKET" ? "서류함" : "역할연기"} · v{s.version} ·{" "}
                        {s.code}
                      </p>
                    </button>
                    {s.status === "DRAFT" ? (
                      <button
                        type="button"
                        disabled={busy}
                        title="드래프트 게시"
                        onClick={(e) => {
                          e.stopPropagation();
                          void publishScenario(s.id, false);
                        }}
                        className={`shrink-0 self-center px-2 py-1 text-[10px] font-medium underline-offset-2 hover:underline disabled:opacity-50 ${
                          selectedId === s.id ? "text-background/90" : "text-accent"
                        }`}
                      >
                        게시
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={`rounded-xl border border-card-border bg-card/40 p-4 sm:p-5 ${
            selected ? "" : "hidden lg:block"
          }`}
        >
          {!selected ? (
            <p className="text-sm text-muted">왼쪽에서 과제를 선택하세요.</p>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="min-h-10 text-sm font-medium text-accent hover:underline lg:hidden"
              >
                ← 과제 목록
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="break-all text-xs text-muted">
                    {selected.code} · {selected.status} · v{selected.version}
                  </p>
                  <input
                    className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-base font-semibold sm:max-w-xl sm:text-lg"
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
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
                    className="min-h-11 rounded-lg border border-card-border px-3 py-2 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void loadCandidatePreview()}
                    className="min-h-11 rounded-lg border border-card-border px-3 py-2 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs"
                  >
                    미리보기
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void duplicateSelected()}
                    className="min-h-11 rounded-lg border border-card-border px-3 py-2 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs"
                  >
                    복제
                  </button>
                  {selected.status === "PUBLISHED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void publishSelected(true)}
                      className="min-h-11 rounded-lg border border-card-border px-3 py-2 text-sm sm:min-h-0 sm:py-1.5 sm:text-xs"
                    >
                      게시 취소
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || selected.status === "ARCHIVED"}
                      onClick={() => void publishSelected(false)}
                      className="min-h-11 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background sm:min-h-0 sm:py-1.5 sm:text-xs"
                    >
                      {busy ? "처리 중…" : "드래프트 게시"}
                    </button>
                  )}
                  {selected.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void archiveSelected()}
                      className="min-h-11 rounded-lg border border-warning/40 px-3 py-2 text-sm text-warning sm:min-h-0 sm:py-1.5 sm:text-xs"
                    >
                      보관
                    </button>
                  ) : null}
                </div>
              </div>

              {candidatePreview ? (
                <pre className="max-h-48 overflow-auto rounded-lg border border-card-border bg-background/80 p-3 text-xs whitespace-pre-wrap text-muted">
                  {candidatePreview}
                </pre>
              ) : null}

              {selected.status !== "ARCHIVED" ? (
                <div className="rounded-lg border border-card-border bg-background/50 p-3">
                  <p className="text-xs font-semibold text-foreground">게시 준비 상태</p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {readiness.map((row) => (
                      <li
                        key={row.label}
                        className={`text-xs ${row.ok ? "text-muted" : "text-warning"}`}
                      >
                        {row.ok ? "✓" : "·"} {row.label}
                      </li>
                    ))}
                  </ul>
                  {selected.status === "DRAFT" ? (
                    <p className="mt-2 text-[11px] text-muted">
                      「드래프트 게시」를 누르면 미연결 역량·루브릭·기본 행동지표를 자동 보정한 뒤
                      게시합니다.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <label className="block text-xs font-medium">
                과제 브리핑
                <textarea
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-base sm:text-sm"
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
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <select
                    className="min-h-11 w-full rounded-lg border border-card-border bg-background px-2 py-2 text-sm sm:min-h-0 sm:w-auto sm:py-1.5 sm:text-xs"
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
                      {c.competencyId ? (
                        <select
                          className="mt-2 min-h-10 w-full rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs"
                          value={c.rubricSetId ?? ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              void setRubricForCompetency(c.competencyId!, e.target.value);
                            }
                          }}
                        >
                          <option value="">이 역량 루브릭 선택…</option>
                          {(rubricOptionsByCompetency[c.competencyId] ?? []).map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.rubricName}
                              {r.isDefault ? " (기본)" : ""}
                            </option>
                          ))}
                        </select>
                      ) : null}
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
