import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-center text-muted">로딩…</div>}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthLayout>
  );
}
