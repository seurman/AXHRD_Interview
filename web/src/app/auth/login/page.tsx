import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="py-12">
      <Suspense fallback={<div className="text-center text-muted">로딩…</div>}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
