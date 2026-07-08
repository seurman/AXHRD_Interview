import { redirect } from "next/navigation";

export default function LegacyAdminSaasRedirect() {
  redirect("/admin/organizations");
}
