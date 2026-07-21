import { NextResponse } from "next/server";
import {
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import {
  buildGameLevelCatalog,
  getGameRuntimeConfig,
  saveGameRuntimeConfig,
} from "@/lib/competency-game/runtime-config";
import { GAME_TYPE_LABEL_KO, GAME_TYPES } from "@/lib/competency-game/types";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const config = await getGameRuntimeConfig();
  return NextResponse.json({
    config,
    gameTypes: GAME_TYPES.map((t) => ({
      type: t,
      labelKo: GAME_TYPE_LABEL_KO[t],
      enabled: !config.disabledGameTypes.includes(t),
    })),
    catalog: buildGameLevelCatalog(),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  let body: {
    disabledGameTypes?: string[];
    disabledLevelIds?: string[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const before = await getGameRuntimeConfig();
  const next = await saveGameRuntimeConfig({
    disabledGameTypes: Array.isArray(body.disabledGameTypes)
      ? body.disabledGameTypes
      : before.disabledGameTypes,
    disabledLevelIds: Array.isArray(body.disabledLevelIds)
      ? body.disabledLevelIds
      : before.disabledLevelIds,
    updatedByUserId: auth.id,
  });

  await logAdminAudit({
    actor: {
      id: auth.id,
      email: auth.email,
      platformRole: auth.platformRole,
    },
    action: "UPDATE",
    entityType: "CompetencyGameRuntimeConfig",
    entityId: "default",
    summary: `역량게임 운영 설정 변경 (타입 ${next.disabledGameTypes.length}개·레벨 ${next.disabledLevelIds.length}개 비활성)`,
    beforeState: before,
    afterState: next,
  });

  return NextResponse.json({
    ok: true,
    config: next,
    gameTypes: GAME_TYPES.map((t) => ({
      type: t,
      labelKo: GAME_TYPE_LABEL_KO[t],
      enabled: !next.disabledGameTypes.includes(t),
    })),
    catalog: buildGameLevelCatalog(),
  });
}
