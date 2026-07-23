import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { personaHomeHref } from "@/lib/nav/persona";

export const dynamic = "force-dynamic";

function pickParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Legacy `/dashboard` entry — always land on jobseeker (Growth home).
 * Sticky persona cookies must not divert this hub; use PersonaSwitcher
 * on the destination page to change roles.
 */
export default async function DashboardIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard/jobseeker");

  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (pickParam(sp.welcome) === "1") qs.set("welcome", "1");
  const name = pickParam(sp.name);
  if (name) qs.set("name", name);
  const q = qs.toString();
  const home = personaHomeHref("jobseeker");
  redirect(q ? `${home}?${q}` : home);
}
