"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_DEMOGRAPHIC_CODES } from "@/lib/diagnostic/section-filter";

type Org = { id: string; name: string };
type Instrument = {
  id: string;
  code: string;
  nameKo: string;
  sections: Array<{ code: string; nameKo: string }>;
};

type DemographicGroupId = "basic" | "global" | "domestic" | "sensitive";

type DemographicCatalogItem = {
  code: string;
  label: string;
  group: DemographicGroupId;
};

const DEMOGRAPHIC_GROUPS: Array<{ id: DemographicGroupId; title: string }> = [
  { id: "basic", title: "기본" },
  { id: "global", title: "글로벌 표준" },
  { id: "domestic", title: "국내 특화" },
  { id: "sensitive", title: "민감정보 — 별도 동의 필요" },
];

const DEMOGRAPHIC_CATALOG: DemographicCatalogItem[] = [
  { code: "DM01", label: "직급", group: "basic" },
  { code: "DM02", label: "재직기간", group: "basic" },
  { code: "DM03", label: "부서유형", group: "basic" },
  { code: "DM04", label: "연령대", group: "basic" },
  { code: "DM05", label: "AI 활용빈도", group: "basic" },
  { code: "DM06", label: "성별", group: "basic" },
  { code: "DM08", label: "최종학력", group: "basic" },
  { code: "DM09", label: "관리자 여부", group: "global" },
  { code: "DM10", label: "근무형태", group: "global" },
  { code: "DM07", label: "고용형태", group: "domestic" },
  { code: "DM11", label: "근무지역", group: "domestic" },
  { code: "DM12", label: "장애 여부", group: "sensitive" },
];

type Props = {
  onClose: () => void;
  onCreated: (waveId: string, organizationId: string) => void;
  /** 기관 허브에서 열면 기관 고정 */
  lockedOrganizationId?: string;
};

export function AdminDiagnosticWizard({
  onClose,
  onCreated,
  lockedOrganizationId,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(lockedOrganizationId ? 2 : 1);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [orgId, setOrgId] = useState(lockedOrganizationId ?? "");
  const [newOrgMode, setNewOrgMode] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  const [enabledDemographicItems, setEnabledDemographicItems] = useState<string[]>([
    ...DEFAULT_DEMOGRAPHIC_CODES,
  ]);
  const [label, setLabel] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [estimatedResponses, setEstimatedResponses] = useState("200");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInstrument = instruments.find((i) => i.id === instrumentId);

  useEffect(() => {
    void (async () => {
      const [orgRes, instRes] = await Promise.all([
        fetch("/api/admin/organizations"),
        fetch("/api/admin/diagnostic/instruments"),
      ]);
      const orgJson = await orgRes.json();
      const instJson = await instRes.json();
      if (orgRes.ok) setOrgs(orgJson.organizations ?? []);
      if (instRes.ok) {
        const list = instJson.instruments ?? [];
        setInstruments(list);
        if (list[0]) {
          setInstrumentId(list[0].id);
          setEnabledSections(list[0].sections.map((s: { code: string }) => s.code));
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (lockedOrganizationId) setOrgId(lockedOrganizationId);
  }, [lockedOrganizationId]);

  const toggleSection = (code: string) => {
    setEnabledSections((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const toggleDemographic = (code: string) => {
    setEnabledDemographicItems((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const ensureOrgId = async (): Promise<string | null> => {
    if (lockedOrganizationId) return lockedOrganizationId;
    if (!newOrgMode) return orgId || null;
    const name = newOrgName.trim();
    if (name.length < 2) {
      setError("기관명을 2자 이상 입력해 주세요.");
      return null;
    }
    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, status: "APPROVED" }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "기관 생성 실패");
      return null;
    }
    return json.organization?.id ?? json.id ?? null;
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const organizationId = await ensureOrgId();
      if (!organizationId) {
        setLoading(false);
        return;
      }
      if (!instrumentId || enabledSections.length === 0) {
        setError("진단도구와 섹션을 선택해 주세요.");
        setLoading(false);
        return;
      }
      if (enabledDemographicItems.length === 0) {
        setError("데모그래픽 문항을 1개 이상 선택해 주세요.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/admin/diagnostic/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          instrumentId,
          enabledSectionCodes: enabledSections,
          enabledDemographicItemCodes: enabledDemographicItems,
          label: label.trim() || undefined,
          opensAt: opensAt || null,
          closesAt: closesAt || null,
          estimatedResponses: estimatedResponses.trim()
            ? Number(estimatedResponses)
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "생성 실패");
      const waveId = json.wave.id as string;
      onCreated(waveId, organizationId);
      router.push(`/admin/organizations/${organizationId}/waves/${waveId}?created=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 중 오류");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
      <div className="card-luxe max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">새 진단 시작</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-foreground">
            닫기
          </button>
        </div>

        <p className="mb-4 text-xs text-muted">
          {lockedOrganizationId ? `기관 고정 · Step ${step} / 3` : `Step ${step} / 3`}
        </p>

        {step === 1 && !lockedOrganizationId && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newOrgMode}
                onChange={(e) => setNewOrgMode(e.target.checked)}
              />
              신규 기관 등록
            </label>
            {newOrgMode ? (
              <input
                className="input-luxe w-full text-sm"
                placeholder="기관명"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            ) : (
              <select
                className="input-luxe w-full text-sm"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                <option value="">기관 선택…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {step === 2 && selectedInstrument && (
          <div className="space-y-4">
            <select
              className="input-luxe w-full text-sm"
              value={instrumentId}
              onChange={(e) => {
                const id = e.target.value;
                setInstrumentId(id);
                const inst = instruments.find((i) => i.id === id);
                if (inst) setEnabledSections(inst.sections.map((s) => s.code));
              }}
            >
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nameKo} ({i.code})
                </option>
              ))}
            </select>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">활성 섹션</p>
              {selectedInstrument.sections.map((sec) => (
                <label key={sec.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabledSections.includes(sec.code)}
                    onChange={() => toggleSection(sec.code)}
                  />
                  {sec.code} — {sec.nameKo}
                </label>
              ))}
            </div>

            <div className="space-y-3 border-t border-card-border pt-4">
              <p className="text-sm font-medium text-foreground">데모그래픽 문항</p>
              <p className="text-xs text-muted">
                이번 웨이브에서 수집할 기본 정보 문항을 선택합니다. 기본 5개(DM01~DM05)는 사전
                선택되어 있습니다.
              </p>
              {DEMOGRAPHIC_GROUPS.map((group) => {
                const items = DEMOGRAPHIC_CATALOG.filter((i) => i.group === group.id);
                const sensitiveOn =
                  group.id === "sensitive" &&
                  items.some((i) => enabledDemographicItems.includes(i.code));
                return (
                  <div key={group.id} className="space-y-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p
                      className={`text-xs font-semibold ${
                        group.id === "sensitive" ? "text-amber-700 dark:text-amber-400" : "text-muted"
                      }`}
                    >
                      {group.title}
                    </p>
                    {items.map((item) => (
                      <label key={item.code} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={enabledDemographicItems.includes(item.code)}
                          onChange={() => toggleDemographic(item.code)}
                        />
                        {item.code} — {item.label}
                      </label>
                    ))}
                    {sensitiveOn && (
                      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                        이 항목은 개인정보보호법상 민감정보입니다. 응답자에게 별도 동의를 받아야
                        합니다.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <input
              className="input-luxe w-full text-sm"
              placeholder="진단명 (선택)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted">시작일 (선택)</label>
              <input
                type="date"
                className="input-luxe mt-1 w-full text-sm"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted">종료일 (선택)</label>
              <input
                type="date"
                className="input-luxe mt-1 w-full text-sm"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted">예상 응답 인원 (견적)</label>
              <input
                type="number"
                min={0}
                className="input-luxe mt-1 w-full text-sm"
                value={estimatedResponses}
                onChange={(e) => setEstimatedResponses(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted">
                기관 단가(웨이브 패키지·연간 좌석·응답 단가)로 생성 시 견적이 스냅샷됩니다.
              </p>
            </div>
            <p className="text-xs text-muted">시작·종료를 비워두면 수동 마감합니다.</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 flex justify-between gap-2">
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            disabled={step === 1 || (lockedOrganizationId != null && step === 2)}
            onClick={() => setStep((s) => s - 1)}
          >
            이전
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => {
                setError(null);
                if (step === 1 && !lockedOrganizationId && !newOrgMode && !orgId) {
                  setError("기관을 선택해 주세요.");
                  return;
                }
                if (step === 2 && enabledSections.length === 0) {
                  setError("섹션을 1개 이상 선택해 주세요.");
                  return;
                }
                if (step === 2 && enabledDemographicItems.length === 0) {
                  setError("데모그래픽 문항을 1개 이상 선택해 주세요.");
                  return;
                }
                setStep((s) => s + 1);
              }}
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              disabled={loading}
              onClick={() => void submit()}
            >
              {loading ? "생성 중…" : "생성"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
