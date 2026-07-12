import { Suspense } from "react";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { SetupForm } from "./SetupForm";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";

export default async function InterviewSetupPage() {
  const user = await requireProductCapability("product.interview", "/interview/setup");

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <WelcomeBanner dismissHref="/interview/setup" />
      </Suspense>
      <SetupForm user={{ id: user.id, name: user.name, email: user.email }} />
    </div>
  );
}
