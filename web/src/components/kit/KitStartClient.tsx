"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader } from "@/components/ui/icons";
import { competencyLabel, jobRoleLabel } from "@/lib/labels";
import { JOB_ROLES } from "@/types";
import type { PublicKitShare } from "@/lib/org/kit-share";

type Props = {
  slug: string;
  initialShare: PublicKitShare;
};

export function KitStartClient({ slug, initialShare }: Props) {
  const router = useRouter();
  const [jobRole, setJobRole] = useState<string>("MARKETING");
  const [focusCompetency, setFocusCompetency] = useState<string>(
    initialShare.competencies[0]?.code ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!focusCompetency) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kit/${slug}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: initialShare.organizationName,
          jobRole,
          focusCompetency,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(`/kit/${slug}`)}`);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "면접을 시작하지 못했습니다.");
      }
      router.push(`/interview/${data.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "면접을 시작하지 못했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          {initialShare.organizationName} · {initialShare.label}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          이 기관이 구성한 면접으로 연습하기
        </h1>
        <p className="mt-2 text-sm text-muted">
          AXHRD 인터뷰 계정으로 로그인하면 바로 시작할 수 있습니다. 기관에 별도로
          가입할 필요는 없습니다.
        </p>
        <p className="mt-3 rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-foreground">
          이 모의면접 결과는 <strong>{initialShare.organizationName}</strong> 채용 담당자에게
          전달됩니다.
        </p>
      </div>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">직무</h2>
        <select
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          className="input-luxe w-full"
        >
          {JOB_ROLES.map((r) => (
            <option key={r} value={r}>
              {jobRoleLabel(r)}
            </option>
          ))}
        </select>
      </section>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">역량</h2>
        {initialShare.competencies.length === 0 ? (
          <p className="text-sm text-danger">
            이 링크에 설정된 역량이 없습니다. 기관 담당자에게 문의해 주세요.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {initialShare.competencies.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setFocusCompetency(c.code)}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  focusCompetency === c.code
                    ? "border-gold bg-gold/10 text-foreground ring-1 ring-gold/30"
                    : "border-card-border text-foreground hover:border-gold/40"
                }`}
              >
                <span className="font-medium">{c.nameKo || competencyLabel(c.code)}</span>
                {c.description && (
                  <span className="mt-1 block text-xs opacity-70">{c.description}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void start()}
        disabled={loading || !focusCompetency}
        className="btn-primary w-full py-3.5"
      >
        {loading ? (
          <>
            <IconLoader /> 준비 중…
          </>
        ) : (
          "면접 시작하기"
        )}
      </button>
    </div>
  );
}
