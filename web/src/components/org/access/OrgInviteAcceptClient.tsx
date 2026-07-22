"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function OrgInviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [meta, setMeta] = useState<{
    email: string;
    organization: { id: string; name: string };
    orgRole: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/org/invitations/accept/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "초대를 불러올 수 없습니다.");
        return;
      }
      setMeta(data);
    })();
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/invitations/accept/${token}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "수락 실패");
      router.push("/org/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "수락 실패");
    } finally {
      setBusy(false);
    }
  };

  const registerHref = meta
    ? `/auth/register?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(meta.email)}&next=${encodeURIComponent(`/org/invite/${token}`)}`
    : `/auth/register?invite=${encodeURIComponent(token)}`;
  const loginHref = `/auth/login?next=${encodeURIComponent(`/org/invite/${token}`)}`;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">기관 초대</h1>
      <div className="card-luxe space-y-4 p-6">
        {error && !meta ? (
          <p className="text-sm text-danger">{error}</p>
        ) : meta ? (
          <>
            <p className="text-foreground">
              <span className="font-semibold">{meta.organization.name}</span>에
              초대되었습니다.
            </p>
            <p className="text-sm text-muted">
              초대 이메일: {meta.email}
              <br />
              역할: {meta.orgRole === "STAFF" ? "담당자" : "구성원"}
              <br />
              만료: {new Date(meta.expiresAt).toLocaleString("ko-KR")}
            </p>
            {needsAuth || error?.includes("로그인") ? (
              <div className="flex flex-wrap gap-2">
                <Link href={registerHref} className="btn-primary px-4 py-2 text-sm">
                  가입 후 수락
                </Link>
                <Link href={loginHref} className="btn-secondary px-4 py-2 text-sm">
                  로그인
                </Link>
              </div>
            ) : (
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                disabled={busy}
                onClick={() => void accept()}
              >
                {busy ? "처리 중…" : "초대 수락"}
              </button>
            )}
            {error ? <p className="text-xs text-danger">{error}</p> : null}
            <p className="text-xs text-muted">
              계정이 없으면{" "}
              <Link href={registerHref} className="text-accent hover:underline">
                회원가입
              </Link>
              후 같은 이메일로 수락하세요.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">초대 확인 중…</p>
        )}
      </div>
    </div>
  );
}
