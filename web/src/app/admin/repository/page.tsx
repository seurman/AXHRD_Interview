import { requireProductionContentAdmin } from "@/lib/auth/guards";
import { RepositoryConsole } from "@/components/admin/repository/RepositoryConsole";

export const dynamic = "force-dynamic";

export default async function AdminRepositoryPage() {
  await requireProductionContentAdmin("/admin/repository");
  return <RepositoryConsole />;
}
