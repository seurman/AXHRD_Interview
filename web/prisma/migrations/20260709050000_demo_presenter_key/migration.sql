-- Demo presenter key + presenter interview sessions
ALTER TABLE "DemoWorkspace" ADD COLUMN IF NOT EXISTS "presenterKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "DemoWorkspace_presenterKey_key" ON "DemoWorkspace"("presenterKey");

ALTER TABLE "InterviewSession" ADD COLUMN IF NOT EXISTS "isPresenterDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InterviewSession" ADD COLUMN IF NOT EXISTS "demoWorkspaceId" TEXT;
