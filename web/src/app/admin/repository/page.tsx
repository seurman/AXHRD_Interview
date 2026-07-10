import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ competency?: string; tab?: string }>;
};

/** @deprecated — Framework Studio(/admin/content)로 통합됨 */
export default async function AdminRepositoryRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.competency) qs.set("competency", params.competency);
  if (params.tab) qs.set("tab", params.tab === "quality" ? "quality" : params.tab);
  const query = qs.toString();
  redirect(query ? `/admin/content?${query}` : "/admin/content");
}
