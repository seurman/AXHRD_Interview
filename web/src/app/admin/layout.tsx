import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { hasCapability } from "@/lib/platform/access";
import { buildNavigationForUser } from "@/lib/platform/nav-registry";
import { PlatformConsoleSidebar } from "@/components/admin/PlatformConsoleSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser("/admin");
  const nav = await buildNavigationForUser(user);

  const hasAnyPlatform =
    nav.platformConsoleHrefs.length > 0 ||
    hasCapability(user, "platform.content") ||
    hasCapability(user, "platform.demo");

  if (!hasAnyPlatform) notFound();

  return (
    <div className="mx-auto flex max-w-7xl">
      <PlatformConsoleSidebar items={nav.platformConsoleHrefs} />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
