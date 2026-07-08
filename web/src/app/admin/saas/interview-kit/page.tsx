import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ organizationId?: string }>;
};

export default async function LegacyAdminSaasKitRedirect({ searchParams }: Props) {
  const { organizationId } = await searchParams;
  if (organizationId?.trim()) {
    redirect(`/admin/organizations/${organizationId.trim()}/interview-kit`);
  }
  redirect("/admin/organizations");
}
