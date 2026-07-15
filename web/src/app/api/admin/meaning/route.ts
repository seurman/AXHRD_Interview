import { NextResponse } from "next/server";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import {
  loadMeaningLayerSnapshot,
  upsertConceptRelation,
} from "@/lib/meaning/layer";
import type { ConceptEdgeType, ConceptNodeKind } from "@prisma/client";

export async function GET() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const snapshot = await loadMeaningLayerSnapshot();
    return NextResponse.json(snapshot);
  } catch (e) {
    console.error("[admin/meaning GET]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ConceptRelation") || msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "Meaning Layer 테이블이 없습니다. `npx prisma migrate deploy` 후 `npm run db:seed:meaning`을 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Meaning Layer 조회 실패" }, { status: 500 });
  }
}

const EDGE_TYPES: ConceptEdgeType[] = [
  "MEMBER_OF",
  "HAS_LEVEL",
  "PROBES",
  "ALIGNS_WITH",
  "MAPS_TO",
  "CONTEXTUALIZES",
  "SIGNALS",
  "SUPPORTED_BY",
];

const NODE_KINDS: ConceptNodeKind[] = [
  "NCS_COMPETENCY",
  "GLOBAL_CLUSTER",
  "GLOBAL_COMPETENCY",
  "GLOBAL_RUBRIC_LEVEL",
  "IRT_QUESTION",
  "GLOBAL_QUESTION",
  "BENCHMARK_REF",
  "ROLE_CONTEXT",
  "DIAGNOSTIC_SUBSCALE",
];

export async function POST(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const edgeType = body.edgeType as ConceptEdgeType;
    const fromKind = body.fromKind as ConceptNodeKind;
    const toKind = body.toKind as ConceptNodeKind;
    const fromKey = typeof body.fromKey === "string" ? body.fromKey.trim() : "";
    const toKey = typeof body.toKey === "string" ? body.toKey.trim() : "";
    const weight = typeof body.weight === "number" ? body.weight : 1;
    const note = typeof body.note === "string" ? body.note.trim() || null : null;

    if (!EDGE_TYPES.includes(edgeType) || !NODE_KINDS.includes(fromKind) || !NODE_KINDS.includes(toKind)) {
      return NextResponse.json({ error: "잘못된 edge/node 타입입니다." }, { status: 400 });
    }
    if (!fromKey || !toKey) {
      return NextResponse.json({ error: "fromKey·toKey가 필요합니다." }, { status: 400 });
    }

    const row = await upsertConceptRelation({
      edgeType,
      fromKind,
      fromKey,
      toKind,
      toKey,
      weight,
      note,
      source: "admin",
    });

    await logAdminAudit({
      actor: auth,
      action: "UPDATE",
      entityType: "concept_relation",
      entityId: row.id,
      summary: `Meaning edge ${edgeType}: ${fromKind}:${fromKey} → ${toKind}:${toKey}`,
      afterState: row,
    });

    return NextResponse.json({ relation: row });
  } catch (e) {
    console.error("[admin/meaning POST]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `저장 실패: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}
