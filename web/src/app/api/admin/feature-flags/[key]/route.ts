import { NextResponse } from "next/server";
import { auditActor, isAdminResponse, requireSuperadminApi } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import { isKnownFeatureFlagKey } from "@/lib/platform/feature-flags";

type RouteContext = { params: Promise<{ key: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireSuperadminApi();
  if (isAdminResponse(auth)) return auth;

  const { key: rawKey } = await context.params;
  const key = decodeURIComponent(rawKey).trim();
  if (!isKnownFeatureFlagKey(key)) {
    return NextResponse.json({ error: "알 수 없는 기능 플래그입니다." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled(boolean)가 필요합니다." }, { status: 400 });
  }

  const before = await prisma.platformFeatureFlag.findUnique({ where: { key } });
  if (!before) {
    return NextResponse.json({ error: "플래그를 찾을 수 없습니다." }, { status: 404 });
  }

  const flag = await prisma.platformFeatureFlag.update({
    where: { key },
    data: {
      enabled: body.enabled,
      updatedBy: auth.email,
    },
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "platform_feature_flag",
    entityId: flag.id,
    summary: `[기능 플래그] ${flag.label} ${body.enabled ? "활성화" : "비활성화"}`,
    beforeState: {
      key: before.key,
      label: before.label,
      enabled: before.enabled,
    },
    afterState: {
      key: flag.key,
      label: flag.label,
      enabled: flag.enabled,
    },
  });

  return NextResponse.json({
    ok: true,
    flag: {
      key: flag.key,
      label: flag.label,
      description: flag.description,
      enabled: flag.enabled,
    },
  });
}
