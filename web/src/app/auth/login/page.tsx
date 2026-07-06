import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-center text-muted">로딩…</div>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthLayout>
  );
}
