import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  SCENARIO_WITH_FRAMEWORK_INCLUDE,
  toCandidateScenarioPayload,
} from "@/lib/assessment/load-scenario-context";
import { parseDialogue } from "@/lib/assessment/role-play-engine";
import { RolePlayRunner } from "@/components/assessment/RolePlayRunner";
import { InBasketRunner } from "@/components/assessment/InBasketRunner";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ attemptId: string }> };

export default async function AssessmentAttemptPage({ params }: Props) {
  const { attemptId } = await params;
  const user = await requirePageUser(`/assessment/attempt/${attemptId}`);

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      scenario: { include: SCENARIO_WITH_FRAMEWORK_INCLUDE },
      itemResponses: {
        select: { itemId: true, actionType: true, responseText: true },
      },
    },
  });
  if (!attempt || attempt.userId !== user.id) notFound();

  // 이미 제출/채점된 시도는 리포트로
  if (attempt.status === "SUBMITTED" || attempt.status === "SCORED") {
    redirect(`/assessment/attempt/${attempt.id}/report`);
  }

  const scenario = toCandidateScenarioPayload(attempt.scenario);

  return (
    <div className="mx-auto max-w-4xl pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-16">
      {scenario.kind === "ROLE_PLAY" ? (
        <RolePlayRunner
          attemptId={attempt.id}
          scenario={scenario}
          initialDialogue={parseDialogue(attempt.dialogueJson)}
        />
      ) : (
        <InBasketRunner
          attemptId={attempt.id}
          scenario={scenario}
          initialResponses={attempt.itemResponses}
        />
      )}
    </div>
  );
}
