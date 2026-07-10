import { requireDiagnosticUser } from "@/lib/auth/guards";
import { DiagnosisOrgConsole } from "@/components/diagnostic/DiagnosisOrgConsole";

export const dynamic = "force-dynamic";

export default async function OrgDiagnosisPage() {
  await requireDiagnosticUser("/org/diagnosis");
  return <DiagnosisOrgConsole />;
}
