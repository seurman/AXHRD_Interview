"use client";

import { useMemo, useState } from "react";
import {
  PRICING_MODEL_LABEL,
  WAVE_PACKAGE_TIERS,
  defaultOrgDiagnosticPricing,
  formatKrw,
  pricingCatalogRows,
  quoteDiagnosticWave,
  type DiagnosticPricingModel,
  type OrgDiagnosticPricing,
  type WavePackageTierCode,
} from "@/lib/diagnostic/pricing";

type Props = {
  value: OrgDiagnosticPricing | null;
  onChange: (next: OrgDiagnosticPricing) => void;
};

const MODELS: DiagnosticPricingModel[] = [
  "WAVE_PACKAGE",
  "SEAT_ANNUAL",
  "PER_RESPONSE",
  "CUSTOM",
];

export function OrgDiagnosticPricingEditor({ value, onChange }: Props) {
  const pricing = value ?? defaultOrgDiagnosticPricing();
  const [previewN, setPreviewN] = useState(
    String(pricing.includedResponses ?? pricing.seatCount ?? 200),
  );

  const preview = useMemo(() => {
    const n = Number(previewN);
    return quoteDiagnosticWave({
      pricing,
      estimatedResponses: Number.isFinite(n) ? n : 0,
      wavesUsedThisYear: 0,
    });
  }, [pricing, previewN]);

  const setModel = (model: DiagnosticPricingModel) => {
    onChange(defaultOrgDiagnosticPricing(model));
  };

  return (
    <div className="space-y-4 rounded-xl border border-card-border bg-background/40 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">조직진단 단가</h3>
        <p className="mt-1 text-xs text-muted">
          글로벌 EX(연간 좌석) · 국내 진단(웨이브 패키지·응답 단가) 벤치마크. VAT 별도 · 수동
          청구(세금계산서).
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {pricingCatalogRows().map((row) => (
          <button
            key={row.model}
            type="button"
            onClick={() => setModel(row.model)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              pricing.model === row.model
                ? "border-accent/50 bg-accent/10"
                : "border-card-border hover:bg-card/60"
            }`}
          >
            <p className="font-semibold text-foreground">{row.title}</p>
            <p className="mt-0.5 text-[11px] text-muted">{row.benchmark}</p>
            <p className="mt-1 text-xs text-accent">{row.example}</p>
          </button>
        ))}
      </div>

      <label className="block text-sm">
        <span className="font-medium">과금 모델</span>
        <select
          className="input-luxe mt-1 w-full"
          value={pricing.model}
          onChange={(e) => setModel(e.target.value as DiagnosticPricingModel)}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {PRICING_MODEL_LABEL[m]}
            </option>
          ))}
        </select>
      </label>

      {pricing.model === "WAVE_PACKAGE" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">패키지 티어</span>
            <select
              className="input-luxe mt-1 w-full"
              value={pricing.waveTierCode ?? "GROWTH"}
              onChange={(e) => {
                const code = e.target.value as WavePackageTierCode;
                const tier = WAVE_PACKAGE_TIERS[code];
                onChange({
                  ...pricing,
                  waveTierCode: code,
                  waveFeeKrw: null,
                  includedResponses: null,
                  overagePerResponseKrw: null,
                  notes: pricing.notes ?? tier.description,
                });
              }}
            >
              {(Object.keys(WAVE_PACKAGE_TIERS) as WavePackageTierCode[]).map((code) => (
                <option key={code} value={code}>
                  {WAVE_PACKAGE_TIERS[code].nameKo} ·{" "}
                  {formatKrw(WAVE_PACKAGE_TIERS[code].waveFeeKrw)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">기본료 오버라이드 (원)</span>
            <input
              type="number"
              min={0}
              className="input-luxe mt-1 w-full"
              placeholder="티어 기본값"
              value={pricing.waveFeeKrw ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  waveFeeKrw: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">포함 응답 오버라이드</span>
            <input
              type="number"
              min={0}
              className="input-luxe mt-1 w-full"
              placeholder="티어 기본값"
              value={pricing.includedResponses ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  includedResponses: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
      )}

      {pricing.model === "SEAT_ANNUAL" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">진단 좌석 수</span>
            <input
              type="number"
              min={1}
              className="input-luxe mt-1 w-full"
              value={pricing.seatCount ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  seatCount: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">연간료 오버라이드 (원)</span>
            <input
              type="number"
              min={0}
              className="input-luxe mt-1 w-full"
              placeholder="좌석×단가 자동"
              value={pricing.annualFeeKrw ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  annualFeeKrw: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">포함 웨이브/년</span>
            <input
              type="number"
              min={0}
              className="input-luxe mt-1 w-full"
              value={pricing.includedWavesPerYear ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  includedWavesPerYear: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">추가 웨이브 요금 (원)</span>
            <input
              type="number"
              min={0}
              className="input-luxe mt-1 w-full"
              value={pricing.extraWaveFeeKrw ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  extraWaveFeeKrw: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
      )}

      {pricing.model === "PER_RESPONSE" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">응답 단가 (원)</span>
            <input
              type="number"
              min={0}
              className="input-luxe mt-1 w-full"
              value={pricing.perResponseKrw ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  perResponseKrw: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">최소 웨이브 요금 (원)</span>
            <input
              type="number"
              min={0}
              className="input-luxe mt-1 w-full"
              value={pricing.minWaveFeeKrw ?? ""}
              onChange={(e) =>
                onChange({
                  ...pricing,
                  minWaveFeeKrw: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
      )}

      {pricing.model === "CUSTOM" && (
        <label className="block text-sm">
          <span className="font-medium">맞춤 웨이브 요금 (원)</span>
          <input
            type="number"
            min={0}
            className="input-luxe mt-1 w-full"
            value={pricing.waveFeeKrw ?? ""}
            onChange={(e) =>
              onChange({
                ...pricing,
                waveFeeKrw: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
      )}

      <label className="block text-sm">
        <span className="font-medium">단가 메모</span>
        <textarea
          className="input-luxe mt-1 w-full text-sm"
          rows={2}
          value={pricing.notes ?? ""}
          onChange={(e) => onChange({ ...pricing, notes: e.target.value || null })}
        />
      </label>

      <div className="rounded-lg border border-card-border/70 bg-card/40 p-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">견적 미리보기 (1웨이브)</p>
          <label className="flex items-center gap-2 text-xs text-muted">
            예상 응답
            <input
              type="number"
              min={0}
              className="input-luxe w-24 py-1 text-xs"
              value={previewN}
              onChange={(e) => setPreviewN(e.target.value)}
            />
          </label>
        </div>
        <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
          {formatKrw(preview.waveFeeKrw)}
          <span className="ml-2 text-xs font-normal text-muted">VAT 별도</span>
        </p>
        {preview.contractSummary ? (
          <p className="mt-1 text-[11px] text-muted">{preview.contractSummary}</p>
        ) : null}
        <ul className="mt-2 space-y-1 text-[11px] text-muted">
          {preview.lines.map((l) => (
            <li key={l.code} className="flex justify-between gap-2">
              <span>{l.label}</span>
              <span className="tabular-nums">{formatKrw(l.amountKrw)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
