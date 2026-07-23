import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DEFAULT_PERSONA,
  PERSONA_COOKIE,
  parsePersona,
  personaHomeHref,
} from "@/lib/nav/persona";

export const dynamic = "force-dynamic";

function pickParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/** Legacy home dashboard entry — route into a persona-specific dashboard. */
export default async function DashboardIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard/jobseeker");

  const jar = await cookies();
  const persona = parsePersona(jar.get(PERSONA_COOKIE)?.value) ?? DEFAULT_PERSONA;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (pickParam(sp.welcome) === "1") qs.set("welcome", "1");
  const name = pickParam(sp.name);
  if (name) qs.set("name", name);
  const q = qs.toString();
  redirect(q ? `${personaHomeHref(persona)}?${q}` : personaHomeHref(persona));
}
