import { notFound } from "next/navigation";
import { requirePageUser, hasSuperadminAccess } from "@/lib/auth/guards";
import { canAccessProductionContentBank, canManageDemoWorkspaces } from "@/lib/auth/roles";
import { hasCapability } from "@/lib/platform/access";
import { buildNavigationForUser } from "@/lib/platform/nav-registry";
import { AdminConsoleFrame } from "@/components/admin/AdminConsoleFrame";
import { dictionary as koDictionary } from "@/lib/i18n/dictionaries/ko";
import type { PlatformRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requirePageUser("/admin");
  const user =
    hasSuperadminAccess(sessionUser) && sessionUser.platformRole !== "SUPERADMIN"
      ? { ...sessionUser, platformRole: "SUPERADMIN" as PlatformRole }
      : sessionUser;

  const nav = await buildNavigationForUser(user);

  const hasAnyPlatform =
    nav.platformConsoleHrefs.length > 0 ||
    canAccessProductionContentBank(user) ||
    canManageDemoWorkspaces(user) ||
    hasCapability(user, "platform.content") ||
    hasCapability(user, "platform.demo");

  if (!hasAnyPlatform) notFound();

  const sidebarSections = nav.adminSections.map((section) => ({
    sectionKey: section.sectionKey,
    items: section.links.map((link) => {
      const meta = nav.platformConsoleHrefs.find((h) => h.href === link.href);
      return {
        href: link.href,
        label: koDictionary.common.admin[link.labelKey],
        capability: meta?.capability ?? ("platform.content" as const),
      };
    }),
  }));

  return (
    <AdminConsoleFrame sections={sidebarSections} userName={user.name}>
      {children}
    </AdminConsoleFrame>
  );
}
