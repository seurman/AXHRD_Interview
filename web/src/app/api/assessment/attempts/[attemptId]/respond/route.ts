import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ attemptId: string }> };

type Body = {
  itemId?: string;
  actionType?: string | null;
  responseText?: string;
};

const ACTION_TYPES = ["REPLY", "DELEGATE", "ESCALATE", "FILE", "DEFER"];
const MAX_RESPONSE_LENGTH = 4000;

/** 서류함 — 아이템별 응답 저장(upsert). 채점 없음(채점은 submit에서 1회). */
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }
  const { attemptId } = await params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const itemId = body.itemId ?? "";
  const responseText = (body.responseText ?? "").trim();
  const actionType =
    body.actionType && ACTION_TYPES.includes(body.actionType)
      ? body.actionType
      : null;
  if (!itemId) {
    return NextResponse.json({ error: "itemId가 필요합니다." }, { status: 400 });
  }
  if (responseText.length > MAX_RESPONSE_LENGTH) {
    return NextResponse.json(
      { error: `응답은 ${MAX_RESPONSE_LENGTH}자 이내로 입력해 주세요.` },
      { status: 400 },
    );
  }

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { scenario: { select: { id: true, kind: true } } },
  });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "시도를 찾을 수 없습니다." }, { status: 404 });
  }
  if (attempt.scenario.kind !== "IN_BASKET") {
    return NextResponse.json({ error: "서류함 과제가 아닙니다." }, { status: 400 });
  }
  if (attempt.status !== "IN_PROGRESS" && attempt.status !== "DRAFT") {
    return NextResponse.json({ error: "이미 제출된 시도입니다." }, { status: 409 });
  }

  // 아이템이 이 시나리오 소속인지 검증
  const item = await prisma.assessmentInBasketItem.findUnique({
    where: { id: itemId },
    select: { scenarioId: true },
  });
  if (!item || item.scenarioId !== attempt.scenario.id) {
    return NextResponse.json({ error: "아이템을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.assessmentItemResponse.upsert({
    where: { attemptId_itemId: { attemptId: attempt.id, itemId } },
    create: { attemptId: attempt.id, itemId, actionType, responseText },
    update: { actionType, responseText },
  });

  await prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { status: "IN_PROGRESS", startedAt: attempt.startedAt ?? new Date() },
  });

  const answered = await prisma.assessmentItemResponse.count({
    where: { attemptId: attempt.id, responseText: { not: "" } },
  });

  return NextResponse.json({ saved: true, answeredCount: answered });
}
