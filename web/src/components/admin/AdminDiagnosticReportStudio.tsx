"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Preset = {
  code: string;
  name: string;
  activeTabs: string[];
  activeSectionCodes: string[] | null;
  showNarratives: boolean;
  showGapMatrix: boolean;
};

type Profile = {
  id: string;
  name: string;
  presetCode: string | null;
  activeTabs: unknown;
  activeSectionCodes: unknown;
  minGroupSize: number | null;
  showNarratives: boolean;
  showGapMatrix: boolean;
};

type WaveRow = {
  id: string;
  waveNumber: number;
  label: string | null;
  organizationName: string;
  sectionBadge: string;
};

type Props = {
  instruments: Array<{ id: string; code: string; nameKo: string }>;
  waves: WaveRow[];
};

const SECTION_OPTIONS = ["OHI", "ORI", "OVI", "OAI"] as const;
const TAB_OPTIONS = [
  ["summary", "종합"],
  ["ohi", "OHI"],
  ["ori", "ORI"],
  ["ovi", "OVI"],
  ["oai", "OAI"],
  ["prescription", "처방"],
] as const;
const DEFAULT_TABS = ["summary", "ohi", "ori", "ovi", "oai", "prescription"];

export function AdminDiagnosticReportStudio({ instruments, waves }: Props) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [defaultProfile, setDefaultProfile] = useState<Profile | null>(null);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(instruments[0]?.id ?? "");
  const [selectedWaveId, setSelectedWaveId] = useState("");
  const [activeTabs, setActiveTabs] = useState<string[]>(DEFAULT_TABS);
  const [activeSections, setActiveSections] = useState<string[]>([...SECTION_OPTIONS]);
  const [minGroupSize, setMinGroupSize] = useState<number | "">("");
  const [showNarratives, setShowNarratives] = useState(true);
  const [showGapMatrix, setShowGapMatrix] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/admin/diagnostic/report-profiles");
    const json = await res.json();
    if (!res.ok) return;
    setPresets(json.presets ?? []);
    const inst = json.instruments?.find((i: { id: string }) => i.id === selectedInstrumentId);
    if (inst?.defaultProfile) {
      applyProfile(inst.defaultProfile);
      setDefaultProfile(inst.defaultProfile);
    }
  }, [selectedInstrumentId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  function applyProfile(p: Profile) {
    const tabs = Array.isArray(p.activeTabs)
      ? p.activeTabs.filter((t): t is string => typeof t === "string")
      : DEFAULT_TABS;
    const sections = Array.isArray(p.activeSectionCodes)
      ? p.activeSectionCodes.filter((c): c is string => typeof c === "string")
      : [...SECTION_OPTIONS];
    setActiveTabs(tabs.length ? tabs : DEFAULT_TABS);
    setActiveSections(sections.length ? sections : [...SECTION_OPTIONS]);
    setMinGroupSize(p.minGroupSize ?? "");
    setShowNarratives(p.showNarratives);
    setShowGapMatrix(p.showGapMatrix);
  }

  function applyPreset(code: string) {
    const preset = presets.find((p) => p.code === code);
    if (!preset) return;
    setActiveTabs(preset.activeTabs);
    setActiveSections(preset.activeSectionCodes ?? [...SECTION_OPTIONS]);
    setShowNarratives(preset.showNarratives);
    setShowGapMatrix(preset.showGapMatrix);
  }

  async function save(scope: "instrument" | "wave") {
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        instrumentId: scope === "instrument" ? selectedInstrumentId : undefined,
        waveId: scope === "wave" ? selectedWaveId : undefined,
        activeTabs,
        activeSectionCodes: activeSections,
        minGroupSize: minGroupSize === "" ? null : Number(minGroupSize),
        showNarratives,
        showGapMatrix,
      };
      const res = await fetch("/api/admin/diagnostic/report-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "저장 실패");
        return;
      }
      setMessage(scope === "wave" ? "캠페인 보고서 프로필이 저장되었습니다." : "기본 보고서 프로필이 저장되었습니다.");
      if (scope === "instrument") await loadMeta();
    } finally {
      setSaving(false);
    }
  }

  if (!instruments.length) {
    return (
      <p className="rounded-xl border border-dashed border-card-border p-6 text-sm text-muted">
        문항뱅크를 먼저 동기화하세요.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-card-border p-4">
        <h3 className="text-sm font-semibold text-foreground">기본 보고서 프로필 (Instrument)</h3>
        <p className="mt-1 text-xs text-muted">
          새 캠페인에 적용되는 기본 탭·축·최소 표본 설정입니다. 캠페인별 override는 아래에서 설정합니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {instruments.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setSelectedInstrumentId(i.id)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                selectedInstrumentId === i.id ? "bg-accent text-white" : "border border-card-border"
              }`}
            >
              {i.code}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => applyPreset(p.code)}
              className="rounded-full border border-card-border px-3 py-1 text-xs hover:bg-background/60"
            >
              {p.name}
            </button>
          ))}
        </div>

        <ReportProfileForm
          activeTabs={activeTabs}
          setActiveTabs={setActiveTabs}
          activeSections={activeSections}
          setActiveSections={setActiveSections}
          minGroupSize={minGroupSize}
          setMinGroupSize={setMinGroupSize}
          showNarratives={showNarratives}
          setShowNarratives={setShowNarratives}
          showGapMatrix={showGapMatrix}
          setShowGapMatrix={setShowGapMatrix}
        />

        <button
          type="button"
          disabled={saving || !selectedInstrumentId}
          onClick={() => void save("instrument")}
          className="btn-primary mt-4 px-4 py-2 text-sm disabled:opacity-50"
        >
          기본 프로필 저장
        </button>
      </div>

      <div className="rounded-xl border border-card-border p-4">
        <h3 className="text-sm font-semibold text-foreground">캠페인별 override</h3>
        <p className="mt-1 text-xs text-muted">특정 웨이브만 다른 보고서 구성을 쓸 때 선택합니다.</p>

        {waves.length === 0 ? (
          <p className="mt-3 text-sm text-muted">캠페인이 없습니다.</p>
        ) : (
          <>
            <select
              className="mt-3 w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={selectedWaveId}
              onChange={(e) => setSelectedWaveId(e.target.value)}
            >
              <option value="">캠페인 선택…</option>
              {waves.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.organizationName} · Wave {w.waveNumber}
                  {w.label ? ` (${w.label})` : ""} · {w.sectionBadge}
                </option>
              ))}
            </select>

            {selectedWaveId && (
              <>
                <ReportProfileForm
                  activeTabs={activeTabs}
                  setActiveTabs={setActiveTabs}
                  activeSections={activeSections}
                  setActiveSections={setActiveSections}
                  minGroupSize={minGroupSize}
                  setMinGroupSize={setMinGroupSize}
                  showNarratives={showNarratives}
                  setShowNarratives={setShowNarratives}
                  showGapMatrix={showGapMatrix}
                  setShowGapMatrix={setShowGapMatrix}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save("wave")}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    캠페인 프로필 저장
                  </button>
                  <Link
                    href={`/admin/diagnostic/waves/${selectedWaveId}/report`}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    보고서 미리보기 →
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {message && <p className="text-sm text-accent">{message}</p>}
      {defaultProfile && (
        <p className="text-xs text-muted">
          현재 기본: {defaultProfile.name}
          {defaultProfile.presetCode ? ` (${defaultProfile.presetCode})` : ""}
        </p>
      )}
    </div>
  );
}

function ReportProfileForm({
  activeTabs,
  setActiveTabs,
  activeSections,
  setActiveSections,
  minGroupSize,
  setMinGroupSize,
  showNarratives,
  setShowNarratives,
  showGapMatrix,
  setShowGapMatrix,
}: {
  activeTabs: string[];
  setActiveTabs: (v: string[]) => void;
  activeSections: string[];
  setActiveSections: (v: string[]) => void;
  minGroupSize: number | "";
  setMinGroupSize: (v: number | "") => void;
  showNarratives: boolean;
  setShowNarratives: (v: boolean) => void;
  showGapMatrix: boolean;
  setShowGapMatrix: (v: boolean) => void;
}) {
  function toggleTab(tab: string) {
    setActiveTabs(
      activeTabs.includes(tab) ? activeTabs.filter((t) => t !== tab) : [...activeTabs, tab],
    );
  }

  function toggleSection(code: string) {
    setActiveSections(
      activeSections.includes(code)
        ? activeSections.filter((c) => c !== code)
        : [...activeSections, code],
    );
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-medium text-muted">활성 탭</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TAB_OPTIONS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={activeTabs.includes(key)}
                onChange={() => toggleTab(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted">활성 축</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SECTION_OPTIONS.map((code) => (
            <label key={code} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={activeSections.includes(code)}
                onChange={() => toggleSection(code)}
              />
              {code}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted">
          최소 표본 (N)
          <input
            type="number"
            min={2}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm"
            value={minGroupSize}
            onChange={(e) =>
              setMinGroupSize(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="기본값 사용"
          />
        </label>
      </div>
      <div className="space-y-2 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showNarratives}
            onChange={(e) => setShowNarratives(e.target.checked)}
          />
          해석·내러티브 블록 표시
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showGapMatrix}
            onChange={(e) => setShowGapMatrix(e.target.checked)}
          />
          팀 갭 매트릭스 표시
        </label>
      </div>
    </div>
  );
}
