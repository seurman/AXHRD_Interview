import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveInterviewKitAccess } from "@/lib/org/interview-kit";
import { normalizeShareCompetencies } from "@/lib/org/kit-share";

const ACCESS_ERRORS: Record<string, string> = {
  not_admin: "기관 ADMIN 권한이 필요합니다.",
  no_org: "대상 기관을 찾을 수 없습니다.",
  not_enabled: "SaaS 개인화 권한이 부여되지 않은 기관입니다. 슈퍼어드민에게 문의하세요.",
};

function accessErrorResponse(reason: string) {
  return NextResponse.json(
    { error: ACCESS_ERRORS[reason] ?? "권한이 없습니다.", code: reason },
    { status: 403 }
  );
}

type Ctx = { params: Promise<{ id: string }> };

async function loadOwnedShare(req: Request, id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  const share = await prisma.orgInterviewKitShare.findUnique({ where: { id } });
  if (!share) {
    return { error: NextResponse.json({ error: "공유 링크를 찾을 수 없습니다." }, { status: 404 }) };
  }

  const { searchParams } = new URL(req.url);
  const requestedOrganizationId = searchParams.get("organizationId") ?? share.organizationId;
  const access = await resolveInterviewKitAccess(user, requestedOrganizationId);
  if (!access.allowed) {
    return { error: accessErrorResponse(access.reason) };
  }
  if (access.organizationId !== share.organizationId) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }

  return { share };
}

type PatchBody = {
  label?: string;
  competencies?: string[];
  isActive?: boolean;
  expiresAt?: string | null;
};

/** 공유 링크 수정 — 이름/허용 역량 변경, 또는 삭제 없이 잠깐 끄기(isActive) */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const resolved = await loadOwnedShare(req, id);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { share } = resolved;

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const data: {
    label?: string;
    competencies?: string[];
    isActive?: boolean;
    expiresAt?: Date | null;
  } = {};

  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label) {
      return NextResponse.json({ error: "코호트/캠페인 이름을 입력해 주세요." }, { status: 400 });
    }
    if (label.length > 80) {
      return NextResponse.json({ error: "이름이 너무 깁니다." }, { status: 400 });
    }
    data.label = label;
  }

  if (Array.isArray(body.competencies)) {
    data.competencies = normalizeShareCompetencies(body.competencies);
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === "") {
      data.expiresAt = null;
    } else {
      const parsed = new Date(body.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "유효하지 않은 만료일입니다." }, { status: 400 });
      }
      data.expiresAt = parsed;
    }
  }

  const updated = await prisma.orgInterviewKitShare.update({
    where: { id: share.id },
    data,
  });

  return NextResponse.json({
    ok: true,
    share: {
      id: updated.id,
      slug: updated.slug,
      label: updated.label,
      competencies: normalizeShareCompetencies(updated.competencies),
      isActive: updated.isActive,
      expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

/** 공유 링크 완전 삭제 — 이미 발급된 세션의 orgKitShareId는 SetNull로 보존됨(리포트 유지) */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const resolved = await loadOwnedShare(req, id);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { share } = resolved;

  await prisma.orgInterviewKitShare.delete({ where: { id: share.id } });
  return NextResponse.json({ ok: true });
}
