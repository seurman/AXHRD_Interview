import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { getCurrentUser } from "@/lib/auth/session";
import { loadPersonalAccessContext } from "@/lib/auth/personal-access";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) {
    const params = await searchParams;
    const accessContext = await loadPersonalAccessContext(user.id);
    redirect(resolvePostLoginRedirect(user, accessContext, params.next ?? null));
  }

  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-center text-muted">로딩…</div>}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthLayout>
  );
}
