import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser, isOrgStaffUser, type RoleUser } from "@/lib/auth/roles";
import {
  approveMembershipRequest,
  membershipErrorResponse,
  rejectMembershipRequest,
} from "@/lib/org/membership";

function canReview(user: RoleUser) {
  return !!user.organizationId && (isOrgAdminUser(user) || isOrgStaffUser(user));
}

/**
 * POST /api/org/membership-requests/bulk
 * body: { action: "approve"|"reject", ids: string[], orgRole?: "MEMBER"|"STAFF", rejectReason?: string }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canReview(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    ids?: unknown;
    orgRole?: string;
    rejectReason?: string | null;
  };

  const action = body.action;
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if ((action !== "approve" && action !== "reject") || ids.length === 0) {
    return NextResponse.json(
      { error: "action(approve|reject)과 ids가 필요합니다." },
      { status: 400 },
    );
  }
  if (ids.length > 50) {
    return NextResponse.json({ error: "한 번에 최대 50건까지 처리할 수 있습니다." }, { status: 400 });
  }

  const orgRole =
    body.orgRole === "STAFF" ? ("STAFF" as const) : body.orgRole === "MEMBER" ? ("MEMBER" as const) : undefined;
  if (action === "approve" && orgRole === "STAFF" && !isOrgAdminUser(user)) {
    return NextResponse.json(
      { error: "담당자 역할로 승인하려면 기관 관리자 권한이 필요합니다." },
      { status: 403 },
    );
  }

  const owned = await prisma.orgMembershipRequest.findMany({
    where: {
      id: { in: ids },
      organizationId: user.organizationId!,
      status: "PENDING",
    },
    select: { id: true },
  });
  const ownedIds = owned.map((r) => r.id);

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  let success = 0;

  for (const id of ownedIds) {
    try {
      if (action === "approve") {
        await approveMembershipRequest(id, user.id, { orgRole });
      } else {
        await rejectMembershipRequest(id, user.id, body.rejectReason ?? null);
      }
      results.push({ id, ok: true });
      success += 1;
    } catch (e) {
      const err = membershipErrorResponse(e);
      results.push({ id, ok: false, error: err.body.error });
    }
  }

  const skipped = ids.filter((id) => !ownedIds.includes(id));
  for (const id of skipped) {
    results.push({ id, ok: false, error: "대기 요청을 찾을 수 없습니다." });
  }

  return NextResponse.json({
    ok: success > 0,
    success,
    failed: results.length - success,
    results,
    message:
      action === "approve"
        ? `${success}명을 승인했습니다.`
        : `${success}건을 거절했습니다.`,
  });
}
