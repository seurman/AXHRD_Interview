"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, Save } from "lucide-react";

type RubricLevel = { id: string; level: number; descriptionKo: string };
type Question = {
  id: string;
  externalId: string;
  questionText: string;
  sortOrder: number;
  isActive: boolean;
};
type Benchmark = {
  id: string;
  frameworkName: string;
  refLabel: string;
  refDefinition: string;
  sourceUrl: string;
  licenseNote: string;
};
type Competency = {
  id: string;
  code: string;
  nameKo: string;
  nameEn: string;
  definition: string;
  rubricLevels: RubricLevel[];
  questions: Question[];
  benchmarks: Benchmark[];
};
type Cluster = {
  id: string;
  code: string;
  nameKo: string;
  nameEn: string;
  description: string | null;
  competencies: Competency[];
};

export function GlobalCompetencyDictionaryPanel() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftDef, setDraftDef] = useState("");
  const [draftLevels, setDraftLevels] = useState<Record<string, string>>({});
  const [draftQuestions, setDraftQuestions] = useState<Record<string, string>>({});
  const [newQuestion, setNewQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/global-competencies");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      setClusters(data.clusters ?? []);
      if (!openCluster && data.clusters?.[0]) setOpenCluster(data.clusters[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = clusters
    .flatMap((c) => c.competencies.map((comp) => ({ cluster: c, comp })))
    .find((x) => x.comp.id === selectedId);

  useEffect(() => {
    if (!selected) return;
    setDraftDef(selected.comp.definition);
    setDraftLevels(
      Object.fromEntries(selected.comp.rubricLevels.map((l) => [l.id, l.descriptionKo]))
    );
    setDraftQuestions(
      Object.fromEntries(selected.comp.questions.map((q) => [q.id, q.questionText]))
    );
    setNewQuestion("");
    setMessage(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveAll() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const updates: Promise<Response>[] = [
        fetch(`/api/admin/global-competencies/${selected.comp.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition: draftDef }),
        }),
      ];
      for (const [id, descriptionKo] of Object.entries(draftLevels)) {
        updates.push(
          fetch(`/api/admin/global-competencies/rubric-levels/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descriptionKo }),
          })
        );
      }
      for (const [id, questionText] of Object.entries(draftQuestions)) {
        updates.push(
          fetch(`/api/admin/global-competencies/questions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionText }),
          })
        );
      }
      const results = await Promise.all(updates);
      for (const r of results) {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "저장 실패");
        }
      }
      if (newQuestion.trim()) {
        const r = await fetch("/api/admin/global-competencies/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competencyId: selected.comp.id,
            questionText: newQuestion.trim(),
          }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "질문 추가 실패");
        }
      }
      setMessage("저장했습니다.");
      await load();
      setSelectedId(selected.comp.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-card-border bg-card p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> 글로벌 역량사전을 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        {error}
        <button type="button" className="ml-3 underline" onClick={() => void load()}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">글로벌 역량사전</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
          Spencer &amp; Spencer(1993) 클러스터 구조를 참고해 자체 저작한 6군·20역량
          사전입니다. IRT NCS 6역량과 분리되어 있으며, 향후 자기평가·360용 콘텐츠
          기반입니다. 영국 Civil Service Behaviours 인용은 OGL v3.0 출처표시를
          포함합니다.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {clusters.map((cluster) => {
            const open = openCluster === cluster.id;
            return (
              <div
                key={cluster.id}
                className="overflow-hidden rounded-xl border border-card-border bg-card"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setOpenCluster(open ? null : cluster.id)}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cluster.nameKo}</p>
                    <p className="text-xs text-muted">{cluster.nameEn}</p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted transition ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <ul className="border-t border-card-border bg-primary/[0.02] py-1">
                    {cluster.competencies.map((comp) => (
                      <li key={comp.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(comp.id)}
                          className={`w-full px-4 py-2 text-left text-sm transition ${
                            selectedId === comp.id
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-foreground hover:bg-primary/5"
                          }`}
                        >
                          {comp.nameKo}
                          <span className="ml-2 text-[10px] text-muted">{comp.code}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5">
          {!selected ? (
            <p className="text-sm text-muted">왼쪽에서 역량을 선택하세요.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-gold">
                  {selected.cluster.nameKo}
                </p>
                <h3 className="mt-1 text-xl font-bold text-foreground">
                  {selected.comp.nameKo}{" "}
                  <span className="text-base font-medium text-muted">
                    ({selected.comp.nameEn})
                  </span>
                </h3>
                <label className="mt-3 block text-xs font-semibold text-muted">정의</label>
                <textarea
                  className="input-luxe mt-1 min-h-[88px] w-full text-sm"
                  value={draftDef}
                  onChange={(e) => setDraftDef(e.target.value)}
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground">루브릭 (L1–L5)</h4>
                <div className="mt-2 space-y-2">
                  {selected.comp.rubricLevels.map((lvl) => (
                    <label key={lvl.id} className="block text-xs">
                      <span className="font-semibold text-primary">L{lvl.level}</span>
                      <input
                        className="input-luxe mt-1 w-full text-sm"
                        value={draftLevels[lvl.id] ?? ""}
                        onChange={(e) =>
                          setDraftLevels((prev) => ({ ...prev, [lvl.id]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground">질문</h4>
                <div className="mt-2 space-y-2">
                  {selected.comp.questions.map((q) => (
                    <label key={q.id} className="block text-xs">
                      <span className="font-mono text-[10px] text-muted">{q.externalId}</span>
                      <textarea
                        className="input-luxe mt-1 min-h-[64px] w-full text-sm"
                        value={draftQuestions[q.id] ?? ""}
                        onChange={(e) =>
                          setDraftQuestions((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                  <label className="block text-xs">
                    <span className="font-semibold text-muted">질문 추가</span>
                    <textarea
                      className="input-luxe mt-1 min-h-[64px] w-full text-sm"
                      placeholder="새 행동사건 질문을 입력하세요"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <details className="rounded-lg border border-card-border bg-primary/[0.03] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  관련 글로벌 벤치마크
                </summary>
                {selected.comp.benchmarks.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">연결된 벤치마크가 없습니다.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {selected.comp.benchmarks.map((b) => (
                      <li key={b.id} className="text-sm">
                        <p className="font-medium text-foreground">
                          {b.frameworkName} · {b.refLabel}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {b.refDefinition}
                        </p>
                        <a
                          href={b.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          출처 <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted">
                          {b.licenseNote}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </details>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => void saveAll()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  저장
                </button>
                {message && <p className="text-sm text-muted">{message}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
