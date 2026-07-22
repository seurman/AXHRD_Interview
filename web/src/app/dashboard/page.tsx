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

/** Legacy home dashboard entry — route into a persona-specific dashboard. */
export default async function DashboardIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const jar = await cookies();
  const persona = parsePersona(jar.get(PERSONA_COOKIE)?.value) ?? DEFAULT_PERSONA;
  redirect(personaHomeHref(persona));
}
