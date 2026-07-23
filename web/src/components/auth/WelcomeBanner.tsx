"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

type WelcomeBannerProps = {
  /** 닫기 시 이동할 경로 (쿼리 제거용) */
  dismissHref?: string;
};

export function WelcomeBanner({ dismissHref = "/dashboard/jobseeker" }: WelcomeBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";
  const name = searchParams.get("name");

  if (!welcome) return null;

  const dismiss = () => {
    // Soft-nav to fragile dashboard entry routes surfaces error.tsx —
    // always force a full document load for dismiss.
    try {
      const url = new URL(dismissHref, window.location.origin);
      if (url.origin === window.location.origin) {
        window.location.assign(url.href);
        return;
      }
    } catch {
      /* fall through */
    }
    router.replace(dismissHref);
  };

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-foreground">
          {name ? `${name}님, ` : ""}회원가입을 환영합니다!
        </p>
        <p className="mt-0.5 text-muted">
          아래에서 산업·직무를 고르고 첫 모의 면접을 시작해 보세요. 역량 기록이 자동으로 저장됩니다.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="rounded p-1 text-muted hover:bg-success/10 hover:text-foreground"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
