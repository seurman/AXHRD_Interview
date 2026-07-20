import { OrgInviteAcceptClient } from "@/components/org/OrgInviteAcceptClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function OrgInviteAcceptPage({ params }: Props) {
  const { token } = await params;
  return <OrgInviteAcceptClient token={token} />;
}
