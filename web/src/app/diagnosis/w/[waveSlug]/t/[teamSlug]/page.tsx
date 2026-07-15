import { notFound } from "next/navigation";
import { DiagnosticSurveyClient } from "@/components/diagnostic/DiagnosticSurveyClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ waveSlug: string; teamSlug: string }> };

export default async function DiagnosisResponsePage({ params }: Props) {
  const { waveSlug, teamSlug } = await params;
  if (!waveSlug || !teamSlug) notFound();

  return (
    <main className="dx-page">
      <DiagnosticSurveyClient waveSlug={waveSlug} teamSlug={teamSlug} />
    </main>
  );
}
