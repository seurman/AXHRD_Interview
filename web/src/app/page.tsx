import { getCurrentUser } from "@/lib/auth/session";
import { HomeLanding } from "@/components/landing/HomeLanding";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <HomeLanding loggedIn={!!user} />;
}
