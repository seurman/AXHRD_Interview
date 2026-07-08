import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";
import { DemoShowcase } from "@/components/demo/DemoShowcase";

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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          공개 킷 ·{" "}
          <Link
            href={`/demo/${encodeURIComponent(publicSlug)}`}
            className="font-mono text-accent hover:underline"
          >
            /demo/{publicSlug}
          </Link>
        </span>
        <span className="text-[11px]">AXHRD interview kit</span>
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
