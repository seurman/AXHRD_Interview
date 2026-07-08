import { notFound } from "next/navigation";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";
import { DemoShowcase } from "@/components/demo/DemoShowcase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicDemoPage({ params }: Props) {
  const { slug } = await params;
  const snap = await loadDemoWorkspaceBySlug(slug);
  if (!snap) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <DemoShowcase slug={slug} />
    </div>
  );
}
