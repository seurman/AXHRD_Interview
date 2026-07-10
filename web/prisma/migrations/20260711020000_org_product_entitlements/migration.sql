-- 기관 단일 인스턴스 + 제품별 entitlement (면접 기본 ON)
ALTER TABLE "Organization" ADD COLUMN "interviewEnabled" BOOLEAN NOT NULL DEFAULT true;
