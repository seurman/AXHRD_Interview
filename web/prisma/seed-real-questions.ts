/**
 * 실전 질문 카드 DB 시드 — IRT 채점 문항 뱅크(seed.ts/questions.json)와는 별개.
 * 출처 메타데이터는 저장하지 않는다(사용자 UI에 노출하지 않음).
 *
 * 이 스크립트는 (industry, jobRole) 조합 단위로 기존 데이터를 지우고 다시 넣으므로
 * 여러 번 실행해도 안전하다(중복 누적 없음).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface SeedRow {
  industry: string;
  jobRole: string;
  competency?: string | null;
  questionText: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  isAiExample: boolean;
}

interface SeedData {
  questions: SeedRow[];
}

async function main() {
  const seedPath = join(__dirname, "../../seed/real-questions.json");
  const data: SeedData = JSON.parse(readFileSync(seedPath, "utf-8"));

  const combos = new Set(data.questions.map((q) => `${q.industry}:${q.jobRole}`));

  for (const combo of combos) {
    const [industry, jobRole] = combo.split(":");
    await prisma.realInterviewQuestion.deleteMany({
      where: { industry: industry as never, jobRole: jobRole as never },
    });
  }

  for (const q of data.questions) {
    await prisma.realInterviewQuestion.create({
      data: {
        industry: q.industry as never,
        jobRole: q.jobRole as never,
        competency: q.competency ?? null,
        questionText: q.questionText,
        sourceName: null,
        sourceUrl: null,
        isAiExample: q.isAiExample,
      },
    });
  }

  console.log(`RealInterviewQuestion 시드 완료: ${data.questions.length}건 (${combos.size}개 조합)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
