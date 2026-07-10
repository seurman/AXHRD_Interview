import { requireSuperadmin } from "@/lib/auth/guards";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { loadPlatformHomeSnapshot } from "@/lib/admin/platform-home-data";
import { PlatformHomeDashboard } from "@/components/admin/PlatformHomeDashboard";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireSuperadmin("/admin");
  const snapshot = await loadPlatformHomeSnapshot();

  return (
    <div className={ADMIN_CONTAINER.default}>
      <PlatformHomeDashboard snapshot={snapshot} />
    </div>
  );
}
