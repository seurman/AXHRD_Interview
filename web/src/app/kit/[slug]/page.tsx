import { notFound } from "next/navigation";
import { loadPublicKitShare } from "@/lib/org/kit-share";
import { KitStartClient } from "@/components/kit/KitStartClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicKitPage({ params }: Props) {
  const { slug } = await params;
  const share = await loadPublicKitShare(slug);
  if (!share) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <KitStartClient slug={slug} initialShare={share} />
    </div>
  );
}
