import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export async function requirePageUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const dest = nextPath
      ? `/auth/login?next=${encodeURIComponent(nextPath)}`
      : "/auth/login";
    redirect(dest);
  }
  return user;
}

export function assertResourceOwner(resourceUserId: string, currentUserId: string) {
  if (resourceUserId !== currentUserId) notFound();
}
