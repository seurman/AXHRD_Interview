"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Upload, Save, Copy } from "lucide-react";
import {
  RUBRIC_IMPORT_TEMPLATE,
  linesToRubric,
  parseRubricByLevel,
  rubricToLines,
  type RubricByLevel,
} from "@/lib/competency/rubric";

export type RubricCompetency = {
  id: string;
  code: string;
  nameKo: string;
  rubricByLevel: RubricByLevel;
};

type Props = {
  competencies: RubricCompetency[];
  onUpdate: (id: string, rubricByLevel: RubricByLevel) => Promise<void>;
  onApplyToQuestions: (competencyId: string, level: number, criteria: string[]) => Promise<void>;
  onImportComplete: () => void;
};

const LEVELS = [1, 2, 3, 4, 5] as const;

export function CompetencyRubricPanel({
  competencies,
  onUpdate,
  onApplyToQuestions,
  onImportComplete,
}: Props) {
  const [selectedId, setSelectedId] = useState(competencies[0]?.id ?? "");
  const [level, setLevel] = useState(1);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const selected = competencies.find((c) => c.id === selectedId);

  const loadLevelText = useCallback(
    (comp: RubricCompetency | undefined, lv: number) => {
      if (!comp) return "";
      const map = comp.rubricByLevel;
      return rubricToLines(map[String(lv)] ?? map.default ?? []);
    },
    []
  );

  useEffect(() => {
    if (selected) setText(loadLevelText(selected, level));
  }, [selected, level, loadLevelText]);

  const selectCompetency = (id: string) => {
    setSelectedId(id);
    const comp = competencies.find((c) => c.id === id);
    setText(loadLevelText(comp, level));
  };

  const selectLevel = (lv: number) => {
    setLevel(lv);
    setText(loadLevelText(selected, lv));
  };

  if (!competencies.length) {
    return <p className="text-sm text-muted">역량을 먼저 추가해 주세요.</p>;
  }

  const saveRubric = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const criteria = linesToRubric(text);
      const next: RubricByLevel = { ...selected.rubricByLevel, [String(level)]: criteria };
      if (criteria.length === 0) delete next[String(level)];
      await onUpdate(selected.id, next);
      setImportMsg("저장되었습니다.");
    } finally {
      setSaving(false);
    }
  };

  const applyToQuestions = async () => {
    if (!selected) return;
    const criteria = linesToRubric(text);
    if (!criteria.length) {
      alert("루브릭 기준을 입력해 주세요.");
      return;
    }
    if (!confirm(`L${level} 문항에 루브릭 ${criteria.length}개 기준을 일괄 적용할까요?`)) return;
    setSaving(true);
    try {
      await onApplyToQuestions(selected.id, level, criteria);
      setImportMsg(`L${level} 문항에 루브릭이 적용되었습니다.`);
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(RUBRIC_IMPORT_TEMPLATE, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rubric-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (file: File) => {
    setSaving(true);
    setImportMsg(null);
    try {
      const raw = JSON.parse(await file.text());
      const res = await fetch("/api/admin/rubrics/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "가져오기 실패");
      setImportMsg(data.message ?? `${data.updated}개 역량 반영`);
      onImportComplete();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "파일 형식이 올바르지 않습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-luxe flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h2 className="font-semibold text-foreground">역량별 채점 루브릭</h2>
          <p className="text-sm text-muted">
            역량·레벨별 기준을 직접 입력하거나 JSON 템플릿으로 일괄 업로드하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadTemplate} className="btn-secondary py-2 text-sm">
            <Download className="h-4 w-4" />
            템플릿 받기
          </button>
          <label className="btn-secondary cursor-pointer py-2 text-sm">
            <Upload className="h-4 w-4" />
            JSON 업로드
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {importMsg && (
        <p className="rounded-lg bg-primary/5 px-4 py-2 text-sm text-primary">{importMsg}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="space-y-2 lg:col-span-3">
          {competencies.map((c) => {
            const count = Object.keys(c.rubricByLevel).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCompetency(c.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selectedId === c.id
                    ? "border-primary bg-primary/5"
                    : "border-card-border hover:border-primary/30"
                }`}
              >
                <p className="font-medium text-foreground">{c.nameKo}</p>
                <p className="text-xs text-muted">
                  {c.code}
                  {count > 0 ? ` · 루브릭 ${count}레벨` : " · 미설정"}
                </p>
              </button>
            );
          })}
        </aside>

        <section className="card-luxe space-y-4 p-6 lg:col-span-9">
          {selected && (
            <>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((lv) => {
                  const has = !!(selected.rubricByLevel[String(lv)]?.length);
                  return (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => selectLevel(lv)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        level === lv
                          ? "bg-primary text-white"
                          : has
                            ? "bg-gold/15 text-gold"
                            : "bg-background text-muted"
                      }`}
                    >
                      L{lv}
                    </button>
                  );
                })}
              </div>

              <label className="block text-sm font-medium text-foreground">
                L{level} 채점 기준 (한 줄에 1개)
              </label>
              <textarea
                className="input-luxe min-h-[200px] w-full font-mono text-sm"
                placeholder={`상황·배경을 구체적으로 설명했는가\n본인의 역할과 행동을 밝혔는가\n정량적 결과를 제시했는가`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveRubric}
                  disabled={saving}
                  className="btn-primary py-2 text-sm"
                >
                  <Save className="h-4 w-4" />
                  역량 루브릭 저장
                </button>
                <button
                  type="button"
                  onClick={applyToQuestions}
                  disabled={saving}
                  className="btn-secondary py-2 text-sm"
                >
                  <Copy className="h-4 w-4" />
                  L{level} 전체 문항에 적용
                </button>
              </div>

              <p className="text-xs text-muted">
                문항별 루브릭이 비어 있으면 면접 채점 시 이 역량·레벨 기본 루브릭을 사용합니다.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function mapCompetencyRubrics(
  rows: Array<{ id: string; code: string; nameKo: string; rubricByLevel?: unknown }>
): RubricCompetency[] {
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    nameKo: c.nameKo,
    rubricByLevel: parseRubricByLevel(c.rubricByLevel),
  }));
}
