import { redirect } from "next/navigation";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { SetupForm } from "./SetupForm";

export default async function InterviewSetupPage() {
  const user = await requireProductCapability("product.interview", "/interview/setup");

  return <SetupForm user={{ id: user.id, name: user.name, email: user.email }} />;
}
