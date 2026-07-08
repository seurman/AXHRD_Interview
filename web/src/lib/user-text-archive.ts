import type { UserTextRecordKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AppendTextRecordInput = {
  userId: string;
  kind: UserTextRecordKind;
  content: string;
  sourceType?: string;
  sourceId?: string;
};

/** 회원 답변·선택을 평문으로 축적 (실패해도 본 요청은 막지 않음) */
export async function appendUserTextRecord(input: AppendTextRecordInput): Promise<void> {
  const text = input.content.trim();
  if (!text) return;

  try {
    await prisma.userTextRecord.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        content: text,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });
  } catch (e) {
    console.error("[user-text-archive] append failed:", e);
  }
}

export function formatInterviewSetupText(params: {
  companyName?: string;
  industry?: string;
  jobRole?: string;
  companySize?: string;
  competency?: string;
  hasResume?: boolean;
  hasJd?: boolean;
}): string {
  const lines = [
    "[면접 설정]",
    params.companyName ? `회사: ${params.companyName}` : null,
    params.industry ? `산업군: ${params.industry}` : null,
    params.jobRole ? `직무: ${params.jobRole}` : null,
    params.companySize ? `기업규모: ${params.companySize}` : null,
    params.competency ? `역량: ${params.competency}` : null,
    `자소서: ${params.hasResume ? "있음" : "없음"}`,
    `JD: ${params.hasJd ? "있음" : "없음"}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function formatInterviewAnswerText(params: {
  competency: string;
  level: number;
  question: string;
  answer: string;
  followUpQuestion?: string | null;
  followUpAnswer?: string | null;
}): string {
  const lines = [
    `[모의면접 답변] 역량 ${params.competency} · L${params.level}`,
    `질문: ${params.question}`,
    `답변: ${params.answer}`,
  ];
  if (params.followUpQuestion) {
    lines.push(`꼬리질문: ${params.followUpQuestion}`);
  }
  if (params.followUpAnswer) {
    lines.push(`꼬리답변: ${params.followUpAnswer}`);
  }
  return lines.join("\n");
}

export function formatSelfDiscoveryAnswerText(params: {
  questionCode: string;
  question: string;
  answer: string;
}): string {
  return [
    `[자기발견] ${params.questionCode}`,
    `질문: ${params.question}`,
    `답변: ${params.answer}`,
  ].join("\n");
}

export function formatSwipeSelectionText(params: {
  action: "PASS" | "SAVE";
  industry?: string;
  jobRole?: string;
  question: string;
  practiceAnswer?: string;
}): string {
  const lines = [
    `[질문카드] ${params.action === "SAVE" ? "저장" : "넘김"}`,
    params.industry ? `산업: ${params.industry}` : null,
    params.jobRole ? `직무: ${params.jobRole}` : null,
    `질문: ${params.question}`,
  ].filter(Boolean) as string[];
  if (params.practiceAnswer) {
    lines.push(`연습답변: ${params.practiceAnswer}`);
  }
  return lines.join("\n");
}

export function formatProfilePreferenceText(params: {
  industry: string;
  jobRole: string;
}): string {
  return `[프로필 선택]\n산업군: ${params.industry}\n직무: ${params.jobRole}`;
}
