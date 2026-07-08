import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { COMPETENCY_CODES } from "@/types";
import type { CompetencyCode } from "@/types";

/** 공유 링크 URL 토큰 — 추측 불가능한 opaque 값(12자, URL-safe). 기관명·라벨을
 *  그대로 슬러그에 노출하지 않아 링크만으로 기관 신원이 드러나지 않게 한다. */
export function generateKitShareSlug(): string {
  return randomBytes(9).toString("base64url");
}

export function parseShareCompetencies(raw: unknown): CompetencyCode[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set(COMPETENCY_CODES as readonly string[]);
  return raw.filter((v): v is CompetencyCode => typeof v === "string" && set.has(v));
}

/** 신규/수정 시 competencies 입력값 검증 — 빈 배열은 "킷에 설정된 전체 역량 허용"을 뜻한다 */
export function normalizeShareCompetencies(raw: unknown): CompetencyCode[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set(COMPETENCY_CODES as readonly string[]);
  const out: CompetencyCode[] = [];
  for (const v of raw) {
    if (typeof v === "string" && set.has(v) && !out.includes(v as CompetencyCode)) {
      out.push(v as CompetencyCode);
    }
  }
  return out;
}

export type PublicKitShare = {
  slug: string;
  label: string;
  organizationId: string;
  organizationName: string;
  competencies: Array<{ code: string; nameKo: string; description: string | null }>;
};

/** 공개 접근(로그인 사용자, 기관 비가입자 포함) 시 슬러그로 킷 공유 정보를 읽는다.
 *  비활성화·만료·기관 미승인 상태면 존재 자체를 숨긴다(null 반환 → 404). */
export async function loadPublicKitShare(slug: string): Promise<PublicKitShare | null> {
  const share = await prisma.orgInterviewKitShare.findUnique({
    where: { slug },
    include: { organization: { select: { id: true, name: true, status: true } } },
  });
  if (!share) return null;
  if (!share.isActive) return null;
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) return null;
  if (share.organization.status !== "APPROVED") return null;

  const allowed = parseShareCompetencies(share.competencies);
  const bank = await loadContentBankSnapshot();

  // 빈 배열이면: 이 기관에 실제로 설정된 킷(OrgInterviewKit)이 있는 역량만 노출.
  // 그마저도 없으면(관리자가 아직 아무 역량도 커스터마이즈하지 않음) 플랫폼 전체 역량을
  // 노출한다 — 그 경우 문항/루브릭은 플랫폼 기본값으로 진행된다(기존 filterQuestionsByOrgKit
  // 폴백과 동일한 관용적 동작).
  let codes: string[];
  if (allowed.length > 0) {
    codes = allowed;
  } else {
    const configured = await prisma.orgInterviewKit.findMany({
      where: { organizationId: share.organizationId },
      select: { competency: true },
    });
    codes = configured.length > 0
      ? configured.map((k) => k.competency)
      : [...COMPETENCY_CODES];
  }

  const codeSet = new Set(codes);
  const competencies = bank.competencies
    .filter((c) => c.isActive && codeSet.has(c.code))
    .map((c) => ({ code: c.code, nameKo: c.nameKo, description: c.description }));

  return {
    slug: share.slug,
    label: share.label,
    organizationId: share.organizationId,
    organizationName: share.organization.name,
    competencies,
  };
}
