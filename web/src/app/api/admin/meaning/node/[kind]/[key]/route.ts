import { NextResponse } from "next/server";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { loadConceptNeighborhood } from "@/lib/meaning/layer";
import type { ConceptNodeKind } from "@prisma/client";

const NODE_KINDS: ConceptNodeKind[] = [
  "NCS_COMPETENCY",
  "GLOBAL_CLUSTER",
  "GLOBAL_COMPETENCY",
  "GLOBAL_RUBRIC_LEVEL",
  "IRT_QUESTION",
  "GLOBAL_QUESTION",
  "BENCHMARK_REF",
  "ROLE_CONTEXT",
];

type Ctx = { params: Promise<{ kind: string; key: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { kind: kindRaw, key: keyRaw } = await params;
  const kind = decodeURIComponent(kindRaw) as ConceptNodeKind;
  const key = decodeURIComponent(keyRaw);

  if (!NODE_KINDS.includes(kind) || !key) {
    return NextResponse.json({ error: "잘못된 노드입니다." }, { status: 400 });
  }

  try {
    const neighborhood = await loadConceptNeighborhood(kind, key);
    return NextResponse.json(neighborhood);
  } catch (e) {
    console.error("[admin/meaning/node GET]", e);
    return NextResponse.json({ error: "이웃 조회 실패" }, { status: 500 });
  }
}
