import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveInterviewKitAccess } from "@/lib/org/interview-kit";
import {
  generateKitShareSlug,
  normalizeShareCompetencies,
} from "@/lib/org/kit-share";

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

async function resolveAccessFromRequest(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const access = await resolveInterviewKitAccess(user, organizationId);
  if (!access.allowed) {
    return { error: accessErrorResponse(access.reason) };
  }
  return { user, access };
}

function shareDto(share: {
  id: string;
  slug: string;
  label: string;
  competencies: unknown;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: share.id,
    slug: share.slug,
    label: share.label,
    competencies: normalizeShareCompetencies(share.competencies),
    isActive: share.isActive,
    expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
  };
}

/** 기관 ADMIN(또는 슈퍼어드민)이 발급한 공유 링크 목록 조회 */
export async function GET(req: Request) {
  const resolved = await resolveAccessFromRequest(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { access } = resolved;

  const shares = await prisma.orgInterviewKitShare.findMany({
    where: { organizationId: access.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    organizationId: access.organizationId,
    shares: shares.map(shareDto),
  });
}

type PostBody = {
  label?: string;
  competencies?: string[];
  expiresAt?: string | null;
};

/** 새 공유 링크 발급("킷 배포") — label(코호트명) + 허용 역량 목록(빈 배열=킷 전체) */
export async function POST(req: Request) {
  const resolved = await resolveAccessFromRequest(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { user, access } = resolved;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "코호트/캠페인 이름을 입력해 주세요." }, { status: 400 });
  }
  if (label.length > 80) {
    return NextResponse.json({ error: "이름이 너무 깁니다." }, { status: 400 });
  }

  const competencies = normalizeShareCompetencies(body.competencies);

  let expiresAt: Date | null = null;
  if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "유효하지 않은 만료일입니다." }, { status: 400 });
    }
    expiresAt = parsed;
  }

  let slug = generateKitShareSlug();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.orgInterviewKitShare.findUnique({ where: { slug } });
    if (!exists) break;
    slug = generateKitShareSlug();
  }

  const share = await prisma.orgInterviewKitShare.create({
    data: {
      organizationId: access.organizationId,
      slug,
      label,
      competencies,
      expiresAt,
      createdByUserId: user.id,
    },
  });

  return NextResponse.json({ ok: true, share: shareDto(share) });
}
