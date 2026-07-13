-- CreateTable
CREATE TABLE "PlatformFeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformFeatureFlag_key_key" ON "PlatformFeatureFlag"("key");

-- Seed: all enabled by default (no regression)
INSERT INTO "PlatformFeatureFlag" ("id", "key", "label", "description", "enabled", "updatedAt")
VALUES
  (
    'clff_resume_claim_verification',
    'resume_claim_verification',
    '자소서 진위 검증',
    '면접 중 자소서 경험 진술의 일관성을 확인하는 추가 질문. 민감 기능이라 필요 시 플랫폼 전체에서 즉시 비활성화할 수 있습니다.',
    true,
    CURRENT_TIMESTAMP
  ),
  (
    'clff_jd_bonus_question',
    'jd_bonus_question',
    'JD 보너스 질문',
    '채용공고(JD) 분석 결과를 바탕으로 역량 면접 후 추가 보너스 질문을 제공합니다.',
    true,
    CURRENT_TIMESTAMP
  ),
  (
    'clff_triple_feedback_mode',
    'triple_feedback_mode',
    '트리플 피드백',
    '답변 직후 코치·면접관·동료 관점의 3중 피드백을 표시합니다.',
    true,
    CURRENT_TIMESTAMP
  );
