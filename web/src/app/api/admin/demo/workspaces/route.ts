import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";
import { slugifyDemoName } from "@/lib/demo/workspace";

export async function GET() {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

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
}

export async function POST(req: Request) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;
  const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";

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
      createdByUserId: auth.id,
    },
  });

  if (body.cloneFromProduction) {
    const { cloneProductionToDemoWorkspace } = await import("@/lib/demo/workspace");
    await cloneProductionToDemoWorkspace(created.id);
  }

  return NextResponse.json({ workspace: created });
}
