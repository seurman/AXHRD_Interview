import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser } from "@/lib/auth/roles";
import { membershipErrorResponse } from "@/lib/org/membership";
import {
  createOrgInvitations,
  listOrgInvitations,
} from "@/lib/org/invitations";

/** GET: 대기 중 초대 목록 / POST: 이메일 초대 생성 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organizationId || !isOrgAdminUser(user)) {
    return NextResponse.json({ error: "기관 관리자 권한이 필요합니다." }, { status: 403 });
  }
  const invitations = await listOrgInvitations(user.organizationId);
  return NextResponse.json({
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      orgRole: i.orgRole,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
      invitedByName: i.invitedBy.name,
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/org/invite/${i.token}`,
      token: i.token,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId || !isOrgAdminUser(user)) {
    return NextResponse.json({ error: "기관 관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    emails?: unknown;
    csv?: string;
    orgRole?: string;
  };

  let emails: string[] = [];
  if (typeof body.csv === "string" && body.csv.trim()) {
    emails = body.csv
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
  }
  if (Array.isArray(body.emails)) {
    emails = [
      ...emails,
      ...body.emails.filter((e): e is string => typeof e === "string"),
    ];
  }

  const orgRole = body.orgRole === "STAFF" ? ("STAFF" as const) : ("MEMBER" as const);

  try {
    const result = await createOrgInvitations({
      organizationId: user.organizationId,
      invitedById: user.id,
      emails,
      orgRole,
    });
    return NextResponse.json({
      ok: true,
      message: `${result.invitations.length}명에게 초대를 발급했습니다.`,
      invitations: result.invitations,
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}
