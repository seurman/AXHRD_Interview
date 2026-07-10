"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type InstrumentSummary = {
  id: string;
  code: string;
  nameKo: string;
  version: string;
  estimatedMinutes: number;
  sections: {
    code: string;
    nameKo: string;
    itemCount: number;
    subscales: { code: string; nameKo: string; itemCount: number }[];
  }[];
};

type WaveRow = {
  id: string;
  waveNumber: number;
  label: string | null;
  status: string;
  organizationName: string;
  teamCount: number;
  responseCount: number;
};

type Props = {
  instruments: InstrumentSummary[];
  waves: WaveRow[];
};

export function AdminDiagnosticCmsPanel({ instruments, waves }: Props) {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const seeded = instruments.length > 0;

  async function runSeed() {
    if (!confirm("ARC Index 문항뱅크(OHI·ORI·OVI·OAI)를 DB에 등록합니다. 계속할까요?")) return;
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/admin/diagnostic/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setSeedError(json.error ?? "시드 실패");
        return;
      }
      router.refresh();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">조직진단 CMS</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          ARC Index는 <strong className="font-medium text-foreground">플랫폼 문항뱅크(시드)</strong> +
          <strong className="font-medium text-foreground"> 기관별 웨이브·팀</strong> +
          <strong className="font-medium text-foreground"> 응답 집계 리포트</strong>로
          동작합니다. 문항 편집은 코드 시드·정본 문서 기준이며, 운영은 아래 3단계입니다.
        </p>
      </div>

      <section className="card-luxe p-6">
        <h2 className="font-semibold text-foreground">운영 3단계</h2>
        <ol className="mt-4 space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
              1
            </span>
            <div>
              <p className="font-medium text-foreground">문항뱅크 시드 (이 화면)</p>
              <p className="mt-1 text-muted">
                OHI·ORI·OVI·OAI 4축 설문지를 DB에 1회 등록합니다. 아래 「문항뱅크 설치」 버튼.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
              2
            </span>
            <div>
              <p className="font-medium text-foreground">기관 SKU 활성화</p>
              <p className="mt-1 text-muted">
                <Link href="/admin/organizations" className="text-accent hover:underline">
                  기관 관리
                </Link>
                에서 해당 기관 카드 하단 「ARC 조직진단 SKU」 토글 ON (또는 기관 상세).
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
              3
            </span>
            <div>
              <p className="font-medium text-foreground">웨이브·팀·산출물 (기관 콘솔)</p>
              <p className="mt-1 text-muted">
                기관 ADMIN이 <code className="text-xs">/org/diagnosis</code>에서 웨이브 생성 → 팀별
                응답 링크 배포 → 제출 후 집계·OHI/ORI/OVI/OAI 리포트 확인.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="card-luxe p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">① 문항뱅크 (ARC Index)</h2>
            <p className="mt-1 text-sm text-muted">정본: docs/arc-index/source/*.md</p>
          </div>
          {!seeded && (
            <button
              type="button"
              disabled={seeding}
              onClick={() => void runSeed()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {seeding ? "설치 중…" : "문항뱅크 설치"}
            </button>
          )}
        </div>

        {seedError && <p className="mt-3 text-sm text-rose-600">{seedError}</p>}

        {!seeded ? (
          <div className="mt-6 rounded-xl border border-dashed border-amber-300/60 bg-amber-50/50 p-6 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              문항뱅크가 아직 설치되지 않았습니다.
            </p>
            <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-200/80">
              운영 DB에 마이그레이션 후 위 「문항뱅크 설치」를 누르거나, 서버에서{" "}
              <code className="text-xs">npx tsx prisma/seed/arc-index.ts</code> 를 실행하세요.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {instruments.map((inst) => (
              <li key={inst.id} className="rounded-xl border border-card-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-foreground">{inst.nameKo}</p>
                  <span className="text-xs text-muted">
                    {inst.code} · {inst.version} · 약 {inst.estimatedMinutes}분
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {inst.sections.map((sec) => (
                    <div
                      key={sec.code}
                      className="rounded-lg bg-background/60 px-3 py-2 text-xs"
                    >
                      <p className="font-medium text-foreground">
                        {sec.code} — {sec.nameKo}
                      </p>
                      <p className="mt-1 text-muted">문항 {sec.itemCount}개</p>
                      {sec.subscales.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-muted">
                          {sec.subscales.map((sub) => (
                            <li key={sub.code}>
                              {sub.code}: {sub.itemCount}문항
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-luxe p-6">
        <h2 className="mb-1 font-semibold text-foreground">②③ 웨이브·산출물 현황</h2>
        <p className="mb-4 text-sm text-muted">
          웨이브 생성은 기관 콘솔에서 합니다. 여기서는 전 기관 제출·리포트를 모니터링합니다.
        </p>
        {waves.length === 0 ? (
          <p className="rounded-xl border border-dashed border-card-border p-6 text-sm text-muted">
            아직 웨이브가 없습니다. 기관 SKU를 켠 뒤 기관 ADMIN이{" "}
            <Link href="/org/diagnosis" className="text-accent hover:underline">
              /org/diagnosis
            </Link>
            에서 웨이브를 만듭니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-4">기관</th>
                  <th className="py-2 pr-4">Wave</th>
                  <th className="py-2 pr-4">상태</th>
                  <th className="py-2 pr-4">팀 / 제출</th>
                  <th className="py-2">산출물</th>
                </tr>
              </thead>
              <tbody>
                {waves.map((w) => (
                  <tr key={w.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-4">{w.organizationName}</td>
                    <td className="py-2 pr-4">
                      {w.waveNumber}
                      {w.label ? ` — ${w.label}` : ""}
                    </td>
                    <td className="py-2 pr-4 text-muted">{w.status}</td>
                    <td className="py-2 pr-4 text-muted">
                      {w.teamCount}팀 / {w.responseCount}건
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/org/diagnosis/waves/${w.id}`}
                        className="text-accent hover:underline"
                      >
                        리포트 보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
