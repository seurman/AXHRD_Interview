import { requireProductionContentAdmin } from "@/lib/auth/guards";
import { RepositoryConsole } from "@/components/admin/repository/RepositoryConsole";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";

export const dynamic = "force-dynamic";

export default async function AdminRepositoryPage() {
  await requireProductionContentAdmin("/admin/repository");
  return (
    <div className={ADMIN_CONTAINER.wide}>
      <RepositoryConsole />
    </div>
  );
}
