import { getCurrentUser } from "@/lib/auth/session";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { DiscoverPageContent } from "@/components/discover/DiscoverPageContent";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (user) {
    await requireProductCapability("product.discover", "/discover");
  }
  return <DiscoverPageContent loggedIn={!!user} />;
}
