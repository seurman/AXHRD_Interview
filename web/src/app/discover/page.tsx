import { getCurrentUser } from "@/lib/auth/session";
import { DiscoverPageContent } from "@/components/discover/DiscoverPageContent";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  return <DiscoverPageContent loggedIn={!!user} />;
}
