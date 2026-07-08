import { NextResponse } from "next/server";
import { loadPublicKitShare } from "@/lib/org/kit-share";

type Ctx = { params: Promise<{ slug: string }> };

/** 공개 킷 공유 링크 메타데이터 — 로그인 여부와 무관하게 조회 가능(랜딩 페이지용) */
export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const share = await loadPublicKitShare(slug);
  if (!share) {
    return NextResponse.json({ error: "링크를 찾을 수 없거나 만료되었습니다." }, { status: 404 });
  }
  return NextResponse.json(share);
}
