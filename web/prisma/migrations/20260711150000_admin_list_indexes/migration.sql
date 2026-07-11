-- Admin users list filters & sort
CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");
CREATE INDEX "User_orgRole_idx" ON "User"("orgRole");
CREATE INDEX "User_signupFlag_idx" ON "User"("signupFlag");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);
CREATE INDEX "User_organizationId_orgRole_idx" ON "User"("organizationId", "orgRole");
CREATE INDEX "User_signupFlag_createdAt_idx" ON "User"("signupFlag", "createdAt" DESC);

-- Admin sessions, cohort, certificate
CREATE INDEX "InterviewSession_createdAt_idx" ON "InterviewSession"("createdAt" DESC);
CREATE INDEX "InterviewSession_status_createdAt_idx" ON "InterviewSession"("status", "createdAt" DESC);
CREATE INDEX "InterviewSession_userId_status_idx" ON "InterviewSession"("userId", "status");

-- Admin organizations console & home dashboard
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Organization_status_name_idx" ON "Organization"("status", "name");
CREATE INDEX "Organization_status_createdAt_idx" ON "Organization"("status", "createdAt");

-- Subscriptions admin & org hub
CREATE INDEX "Subscription_updatedAt_idx" ON "Subscription"("updatedAt" DESC);
CREATE INDEX "Subscription_organizationId_updatedAt_idx" ON "Subscription"("organizationId", "updatedAt" DESC);

-- Diagnostic console & home sparklines
CREATE INDEX "DiagnosticWave_status_idx" ON "DiagnosticWave"("status");
CREATE INDEX "DiagnosticWave_createdAt_idx" ON "DiagnosticWave"("createdAt" DESC);
CREATE INDEX "DiagnosticWave_organizationId_waveNumber_idx" ON "DiagnosticWave"("organizationId", "waveNumber" DESC);
CREATE INDEX "DiagnosticResponse_submittedAt_idx" ON "DiagnosticResponse"("submittedAt" DESC);
CREATE INDEX "DiagnosticResponse_waveId_submittedAt_idx" ON "DiagnosticResponse"("waveId", "submittedAt");

-- Content CMS bank loads & delete guards
CREATE INDEX "Competency_ownerScope_organizationId_idx" ON "Competency"("ownerScope", "organizationId");
CREATE INDEX "Question_ownerScope_organizationId_idx" ON "Question"("ownerScope", "organizationId");
CREATE INDEX "ResponseRecord_questionId_idx" ON "ResponseRecord"("questionId");

-- Demo workspace admin list
CREATE INDEX "DemoWorkspace_updatedAt_idx" ON "DemoWorkspace"("updatedAt" DESC);
