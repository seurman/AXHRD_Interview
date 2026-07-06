import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { DISCOVER_QUESTIONS } from "@/lib/discover/questions";
import { DiscoverSession } from "@/components/discover/DiscoverSession";

export const dynamic = "force-dynamic";

export default async function DiscoverSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requirePageUser(`/discover/${sessionId}`);

  const session = await prisma.selfDiscoverySession.findUnique({
    where: { id: sessionId },
    include: { responses: { orderBy: { order: "asc" } } },
  });

  if (!session) notFound();
  assertResourceOwner(session.userId, user.id);

  if (session.status === "COMPLETED") {
    redirect(`/discover/${sessionId}/report`);
  }

  const questionIndex = session.responses.length;
  const current = DISCOVER_QUESTIONS[questionIndex];

  if (!current) {
    redirect(`/discover/${sessionId}/report`);
  }

  return (
    <DiscoverSession
      sessionId={sessionId}
      initialQuestion={{
        code: current.code,
        text: current.text,
        hint: current.hint,
      }}
      questionIndex={questionIndex}
      totalQuestions={DISCOVER_QUESTIONS.length}
    />
  );
}
