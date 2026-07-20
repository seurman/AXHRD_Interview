import { Suspense } from "react";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { getSessionFeatureFlags } from "@/lib/platform/feature-flags";
import { getResumeableInterviewSessions } from "@/lib/interview/get-resumeable-sessions";
import { ResumeInterviewBanner } from "@/components/interview/ResumeInterviewBanner";
import { SetupForm } from "./SetupForm";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";

export default async function InterviewSetupPage() {
  const user = await requireProductCapability("product.interview", "/interview/setup");
  const featureFlags = await getSessionFeatureFlags();
  const resumeable = await getResumeableInterviewSessions(user.id);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <WelcomeBanner dismissHref="/interview/setup" />
      </Suspense>
      {resumeable.length > 0 ? (
        <div className="mx-auto max-w-2xl px-4 sm:px-0">
          <ResumeInterviewBanner
            variant="setup"
            sessions={resumeable.map((s) => ({
              id: s.id,
              focusCompetency: s.focusCompetency,
              sessionNumber: s.sessionNumber,
              startedAt: s.startedAt?.toISOString() ?? null,
              timeBudgetMinutes: s.timeBudgetMinutes,
            }))}
          />
        </div>
      ) : null}
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 py-12 text-sm text-muted sm:px-0">
            면접 설정을 불러오는 중…
          </div>
        }
      >
        <SetupForm user={{ id: user.id, name: user.name, email: user.email }} featureFlags={featureFlags} />
      </Suspense>
    </div>
  );
}
