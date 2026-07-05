"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "join" | "create";

export function OrgSetupForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("join");
  const [joinCode, setJoinCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "join") {
        if (!joinCode.trim()) {
          setError("가입 코드를 입력해 주세요.");
          return;
        }
        const res = await fetch("/api/org/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ joinCode: joinCode.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "가입에 실패했습니다.");
        router.push("/dashboard");
        router.refresh();
      } else {
        if (!orgName.trim()) {
          setError("기관명을 입력해 주세요.");
          return;
        }
        const res = await fetch("/api/org/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: orgName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "기관 생성에 실패했습니다.");
        router.push("/org/dashboard");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-luxe space-y-5 p-6">
      <div className="flex gap-2 rounded-full bg-background p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-full py-2 transition ${
            mode === "join" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          학생 · 코드로 가입
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-full py-2 transition ${
            mode === "create" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          담당자 · 기관 만들기
        </button>
      </div>

      {mode === "join" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            소속 취업센터/기관 담당자에게 받은 가입 코드를 입력하세요.
          </p>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="예: 7QK3-N2XP"
            className="input-luxe w-full font-mono uppercase tracking-wider"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            기관을 새로 만들면 담당자(ADMIN) 권한과 학생용 가입 코드가 발급됩니다.
          </p>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="예: OO대학교 취업센터"
            className="input-luxe w-full"
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="btn-primary w-full py-3"
      >
        {loading ? "처리 중…" : mode === "join" ? "가입하기" : "기관 만들기"}
      </button>
    </div>
  );
}
