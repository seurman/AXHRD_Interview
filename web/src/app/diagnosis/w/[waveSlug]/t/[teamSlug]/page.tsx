import { notFound } from "next/navigation";
import { DiagnosticSurveyClient } from "@/components/diagnostic/DiagnosticSurveyClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ waveSlug: string; teamSlug: string }> };

export default async function DiagnosisResponsePage({ params }: Props) {
  const { waveSlug, teamSlug } = await params;
  if (!waveSlug || !teamSlug) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <DiagnosticSurveyClient waveSlug={waveSlug} teamSlug={teamSlug} />
    </div>
  );
}
