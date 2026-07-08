import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";
import { DemoShowcase } from "@/components/demo/DemoShowcase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicDemoPage({ params }: Props) {
  const { slug: raw } = await params;
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    slug = raw;
  }

  const snap = await loadDemoWorkspaceBySlug(slug);
  if (!snap) notFound();

  const publicSlug = snap.workspace.slug;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 text-center text-xs text-muted">
        공개 URL:{" "}
        <Link href={`/demo/${encodeURIComponent(publicSlug)}`} className="text-accent hover:underline">
          /demo/{publicSlug}
        </Link>
      </div>
      <DemoShowcase
        slug={publicSlug}
        initialSnap={{
          workspace: {
            name: snap.workspace.name,
            description: snap.workspace.description,
            slug: publicSlug,
          },
          competencies: snap.competencies.filter((c) => c.isActive),
          questions: snap.questions.filter((q) => q.isActive),
        }}
      />
    </div>
  );
}
