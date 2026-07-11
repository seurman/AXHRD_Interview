import { notFound } from "next/navigation";
import { ProductIntro } from "@/components/landing/ProductIntro";
import { isProductSlug, PRODUCT_CATALOG } from "@/lib/landing/products";

export function generateStaticParams() {
  return PRODUCT_CATALOG.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isProductSlug(slug)) notFound();
  return <ProductIntro slug={slug} />;
}
