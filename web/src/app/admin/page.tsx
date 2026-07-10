import { notFound, redirect } from "next/navigation";
import { requirePageUser, hasSuperadminAccess } from "@/lib/auth/guards";
import { hasCapability, resolveUserCapabilities } from "@/lib/platform/access";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import {
  loadContentHomeSnapshot,
  loadPlatformHomeSnapshot,
} from "@/lib/admin/platform-home-data";
import { PlatformHomeDashboard } from "@/components/admin/PlatformHomeDashboard";
import { ContentHomeDashboard } from "@/components/admin/ContentHomeDashboard";
import { dictionary as ko } from "@/lib/i18n/dictionaries/ko";
import { PLATFORM_NAV_ORDER } from "@/lib/platform/nav-registry";

export const dynamic = "force-dynamic";

const CONTENT_LINKS = [
  { href: "/admin/content", labelKey: "content" as const, desc: "IRT 문항·역량 풀 편집" },
  { href: "/admin/repository", labelKey: "repository" as const, desc: "역량 라이프사이클·루브릭 매핑" },
  { href: "/admin/demo", labelKey: "demo" as const, desc: "고객 미팅용 데모 샌드박스" },
];

export default async function AdminHomePage() {
  const user = await requirePageUser("/admin");

  if (hasSuperadminAccess(user)) {
    const snapshot = await loadPlatformHomeSnapshot();
    return (
      <div className={ADMIN_CONTAINER.default}>
        <PlatformHomeDashboard snapshot={snapshot} />
      </div>
    );
  }

  const contentLinks = CONTENT_LINKS.filter((l) => {
    if (l.href === "/admin/content" || l.href === "/admin/repository") {
      return hasCapability(user, "platform.content");
    }
    if (l.href === "/admin/demo") return hasCapability(user, "platform.demo");
    return false;
  }).map((l) => ({
    href: l.href,
    label: ko.common.admin[l.labelKey],
    desc: l.desc,
  }));

  if (contentLinks.length > 0) {
    const snapshot = await loadContentHomeSnapshot();
    return (
      <div className={ADMIN_CONTAINER.default}>
        <ContentHomeDashboard snapshot={snapshot} links={contentLinks} />
      </div>
    );
  }

  const caps = resolveUserCapabilities(user, {
    tenantPersonalizationEnabled: true,
    diagnosticEnabled: true,
  });
  const firstHref = PLATFORM_NAV_ORDER.find((item) => caps.has(item.capability))?.href;
  if (firstHref) redirect(firstHref);

  notFound();
}
