import { notFound } from "next/navigation";
import { DiagnosticSurveyClient } from "@/components/diagnostic/DiagnosticSurveyClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ waveSlug: string }> };

/** 조직 전체 기본 응답 링크 (팀 미지정) — immersive survey stage */
export default async function DiagnosisOrgWidePage({ params }: Props) {
  const { waveSlug } = await params;
  if (!waveSlug) notFound();

  return (
    <main className="dx-page">
      <DiagnosticSurveyClient waveSlug={waveSlug} />
    </main>
  );
}
