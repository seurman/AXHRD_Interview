import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SetupForm } from "./SetupForm";

export default async function InterviewSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/interview/setup");

  return <SetupForm user={{ id: user.id, name: user.name, email: user.email }} />;
}
