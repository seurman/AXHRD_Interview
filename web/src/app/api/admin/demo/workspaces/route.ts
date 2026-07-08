import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";
import { slugifyDemoName } from "@/lib/demo/workspace";
import { generatePresenterKey } from "@/lib/demo/presenter";

export const maxDuration = 60;

export async function GET() {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const workspaces = await prisma.demoWorkspace.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        updatedAt: true,
        _count: { select: { competencies: true, questions: true } },
      },
    });

    return NextResponse.json({ workspaces });
  } catch (e) {
    console.error("[demo/workspaces GET]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("DemoWorkspace")) {
      return NextResponse.json(
        {
          error:
            "DemoWorkspace 테이블이 없습니다. 운영 DB에 `npx prisma migrate deploy`를 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "목록 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;
    const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
    const cloneFromProduction = body.cloneFromProduction !== false;

    if (!name) {
      return NextResponse.json({ error: "데모 이름을 입력해 주세요." }, { status: 400 });
    }

    let slug = slugRaw || slugifyDemoName(name);
    const existing = await prisma.demoWorkspace.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const created = await prisma.demoWorkspace.create({
      data: {
        name,
        slug,
        description,
        presenterKey: generatePresenterKey(),
        createdByUserId: auth.id,
      },
    });

    let cloneWarning: string | null = null;
    if (cloneFromProduction) {
      try {
        const { cloneProductionToDemoWorkspace } = await import("@/lib/demo/workspace");
        await cloneProductionToDemoWorkspace(created.id);
      } catch (cloneErr) {
        console.error("[demo/workspaces clone]", cloneErr);
        cloneWarning =
          cloneErr instanceof Error
            ? `워크스페이스는 만들었지만 운영 문항 복사에 실패했습니다: ${cloneErr.message}`
            : "워크스페이스는 만들었지만 운영 문항 복사에 실패했습니다.";
      }
    }

    return NextResponse.json({
      workspace: created,
      warning: cloneWarning,
    });
  } catch (e) {
    console.error("[demo/workspaces POST]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("DemoWorkspace")) {
      return NextResponse.json(
        {
          error:
            "DemoWorkspace 테이블이 없습니다. 운영 DB에 `npx prisma migrate deploy`를 실행해 주세요.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: `생성 실패: ${msg.slice(0, 200)}` },
      { status: 500 },
    );
  }
}
