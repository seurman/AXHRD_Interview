"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { IconLoader } from "@/components/ui/icons";
import { buildAuthRedirect, parseApiResponse } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const { dict } = useI18n();
  const a = dict.auth;
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/interview/setup";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dataUseConsent, setDataUseConsent] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { email, password, next }
        : { email, password, name, next, dataUseConsent };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const { ok, data, message: apiError } = await parseApiResponse(res);
      if (!ok) throw new Error(apiError);

      const displayName =
        (typeof data.name === "string" ? data.name : "").trim() || name.trim();
      let successMessage: string;
      if (mode === "register") {
        successMessage = data.upgraded
          ? `${displayName}님, 비밀번호 설정이 완료되었습니다.`
          : `${displayName}님, 회원가입이 완료되었습니다!`;
      } else {
        successMessage = `${displayName}님, 로그인되었습니다.`;
      }

      setSuccess(successMessage);
      setLoading(false);

      const serverRedirect =
        typeof data.redirect === "string" && data.redirect.startsWith("/")
          ? data.redirect
          : null;
      const target =
        serverRedirect ?? buildAuthRedirect(next, mode, displayName);

      window.setTimeout(() => {
        window.location.assign(target);
      }, 350);
    } catch (err) {
      setError(err instanceof Error ? err.message : a.errorGeneric);
      setLoading(false);
    }
  };

  const registerHref =
    next && next !== "/demo"
      ? `/auth/register?next=${encodeURIComponent(next)}`
      : "/auth/register";
  const loginHref =
    next && next !== "/demo"
      ? `/auth/login?next=${encodeURIComponent(next)}`
      : "/auth/login";

  return (
    <div className="card-luxe mx-auto max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-foreground">
        {mode === "login" ? a.login : a.register}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "login" ? a.loginDesc : a.registerDesc}
      </p>

      {!success && (
        <div className="mt-6 grid gap-3">
          <a
            href={`/api/auth/oauth/kakao/start?next=${encodeURIComponent(next)}`}
            className="flex w-full items-center justify-center rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#191919] transition hover:brightness-95"
            aria-label="카카오로 로그인"
          >
            카카오로 {mode === "login" ? "로그인" : "시작하기"}
          </a>
          <a
            href={`/api/auth/oauth/naver/start?next=${encodeURIComponent(next)}`}
            className="flex w-full items-center justify-center rounded-lg bg-[#03C75A] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
            aria-label="네이버로 로그인"
          >
            네이버로 {mode === "login" ? "로그인" : "시작하기"}
          </a>
          <div className="flex items-center gap-3 py-1 text-xs text-muted">
            <div className="h-px flex-1 bg-white/10" />
            또는 이메일로 {mode === "login" ? "로그인" : "가입"}
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      )}

      {success ? (
        <div
          className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-6 py-8 text-center"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="font-medium text-foreground">{success}</p>
          <p className="text-sm text-muted">잠시 후 이동합니다…</p>
          <IconLoader className="h-5 w-5 text-accent" />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4" aria-busy={loading}>
          {mode === "register" && (
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-luxe w-full"
            />
          )}
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-luxe w-full"
          />
          <input
            type="password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input-luxe w-full"
          />

          {mode === "register" && (
            <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={dataUseConsent}
                onChange={(e) => setDataUseConsent(e.target.checked)}
                required
                className="mt-0.5 rounded border-card-border"
              />
              <span>
                답변 내용은 익명·집계 형태로 문항 개선과 산업별 인사이트 리포트 생성에 활용될 수
                있습니다. 개인을 식별할 수 있는 형태로 외부에 제공되지 않습니다. (필수 동의 ·{" "}
                <strong className="text-foreground">법무 검토 전 초안 문구</strong>)
              </span>
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && !dataUseConsent)}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <IconLoader />
                {mode === "login" ? "로그인 중…" : "가입 처리 중…"}
              </>
            ) : mode === "login" ? (
              "로그인"
            ) : (
              "가입하기"
            )}
          </button>
        </form>
      )}

      {!success && (
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              계정이 없으신가요?{" "}
              <Link href={registerHref} className="text-primary font-medium hover:underline">
                회원가입
              </Link>
            </>
          ) : (
            <>
              이미 가입하셨나요?{" "}
              <Link href={loginHref} className="text-primary font-medium hover:underline">
                로그인
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
