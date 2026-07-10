import { NextResponse } from "next/server";
import type { CompetencyLifecycleStatus } from "@prisma/client";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import {
  createRepositoryCompetency,
  listRepositoryCompetencies,
} from "@/lib/repository/service";

const CODE_RE = /^[A-Z][A-Z0-9_]{1,31}$/;

export async function GET(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as CompetencyLifecycleStatus | "ALL" | null;

  const competencies = await listRepositoryCompetencies(status ?? "ALL");
  return NextResponse.json({ competencies });
}

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const nameKo = typeof body.nameKo === "string" ? body.nameKo.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;
  const clusterId = typeof body.clusterId === "string" ? body.clusterId : null;

  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "역량 코드는 대문자·숫자·밑줄만 사용할 수 있습니다 (예: COMP_COMM)." },
      { status: 400 },
    );
  }
  if (!nameKo) {
    return NextResponse.json({ error: "역량명을 입력해 주세요." }, { status: 400 });
  }

  try {
    const competency = await createRepositoryCompetency({
      code,
      nameKo,
      description,
      clusterId,
    });
    return NextResponse.json({ competency }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "이미 존재하는 역량 코드입니다." }, { status: 409 });
  }
}
