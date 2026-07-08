import { redirect } from "next/navigation";

export default function LegacyOrgSaasSettingsRedirect() {
  redirect("/org/settings");
}
