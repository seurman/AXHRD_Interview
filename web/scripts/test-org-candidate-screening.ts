/**
 * HTTP access test for org candidate screening.
 * Requires dev server. Run: npx tsx scripts/test-org-candidate-screening.ts
 */
import { randomBytes } from "crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { generateKitShareSlug } from "../src/lib/org/kit-share";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PASSWORD = "candidate-screen-test";

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.find((c) => c.startsWith("hr_in_session="));
  if (!cookie) throw new Error(`No session cookie for ${email}`);
  return cookie.split(";")[0];
}

async function fetchPage(cookie: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const html = await res.text();
  return { status: res.status, html };
}

async function main() {
  const passwordHash = hashPassword(PASSWORD);
  const tag = `cand-${Date.now()}`;

  const orgA = await prisma.organization.create({
    data: {
      name: `Org A ${tag}`,
      joinCode: `OA${randomBytes(2).toString("hex").toUpperCase()}`,
      status: "APPROVED",
      approvedAt: new Date(),
      saasPersonalizationEnabled: true,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: `Org B ${tag}`,
      joinCode: `OB${randomBytes(2).toString("hex").toUpperCase()}`,
      status: "APPROVED",
      approvedAt: new Date(),
      saasPersonalizationEnabled: true,
    },
  });

  const staffA = await prisma.user.create({
    data: {
      email: `${tag}-staff-a@test.local`,
      name: "Staff A",
      passwordHash,
      organizationId: orgA.id,
      orgRole: "ADMIN",
      dataUseConsentAt: new Date(),
    },
  });
  const applicant = await prisma.user.create({
    data: {
      email: `${tag}-applicant@test.local`,
      name: "Applicant",
      passwordHash,
      orgRole: "MEMBER",
      dataUseConsentAt: new Date(),
    },
  });

  const shareA = await prisma.orgInterviewKitShare.create({
    data: {
      organizationId: orgA.id,
      slug: generateKitShareSlug(),
      label: `Campaign ${tag}`,
      createdByUserId: staffA.id,
    },
  });
  const shareB = await prisma.orgInterviewKitShare.create({
    data: {
      organizationId: orgB.id,
      slug: generateKitShareSlug(),
      label: `Other ${tag}`,
      createdByUserId: staffA.id,
    },
  });

  const sessionA = await prisma.interviewSession.create({
    data: {
      userId: applicant.id,
      sessionNumber: 1,
      status: "COMPLETED",
      completedAt: new Date(),
      kitOrganizationId: orgA.id,
      orgKitShareId: shareA.id,
    },
  });
  const sessionB = await prisma.interviewSession.create({
    data: {
      userId: applicant.id,
      sessionNumber: 2,
      status: "COMPLETED",
      completedAt: new Date(),
      kitOrganizationId: orgB.id,
      orgKitShareId: shareB.id,
    },
  });

  try {
    const staffCookie = await login(staffA.email);

    const listOk = await fetchPage(staffCookie, "/org/candidates");
    const shareOk = await fetchPage(staffCookie, `/org/candidates/${shareA.id}`);
    const shareCross = await fetchPage(staffCookie, `/org/candidates/${shareB.id}`);
    const sessionOk = await fetchPage(staffCookie, `/org/candidates/session/${sessionA.id}`);
    const sessionCross = await fetchPage(staffCookie, `/org/candidates/session/${sessionB.id}`);

    const applicantCookie = await login(applicant.email);
    const applicantReport = await fetchPage(
      applicantCookie,
      `/interview/${sessionA.id}/report`,
    );
    const applicantCrossReport = await fetchPage(
      applicantCookie,
      `/interview/${sessionB.id}/report`,
    );

    console.log("=== Org candidate screening ===");
    console.log(
      "Campaign list:",
      listOk.status,
      listOk.html.includes("지원자 결과") ? "✓" : "✗",
    );
    console.log(
      "Own share:",
      shareOk.status,
      shareOk.html.includes(shareA.label) ? "✓" : "✗",
    );
    console.log(
      "Cross share:",
      shareCross.status === 404 || shareCross.html.includes("could not be found")
        ? "✓ blocked"
        : `✗ status ${shareCross.status}`,
    );
    console.log(
      "Own session report:",
      sessionOk.status,
      sessionOk.html.includes("지원자 스크리닝") ? "✓" : "✗",
    );
    console.log(
      "Cross session:",
      sessionCross.status === 404 || sessionCross.html.includes("could not be found")
        ? "✓ blocked"
        : `✗ status ${sessionCross.status}`,
    );

    console.log("\n=== Applicant report regression ===");
    console.log(
      "Own session report:",
      applicantReport.status,
      applicantReport.html.includes("면접 리포트") || applicantReport.html.includes("피드백")
        ? "✓"
        : "✗",
    );
    console.log(
      "Other session (not owner):",
      applicantCrossReport.status === 404 ||
        applicantCrossReport.html.includes("could not be found")
        ? "✓ blocked"
        : `✗ status ${applicantCrossReport.status}`,
    );
  } finally {
    await prisma.interviewSession.deleteMany({
      where: { id: { in: [sessionA.id, sessionB.id] } },
    });
    await prisma.orgInterviewKitShare.deleteMany({
      where: { id: { in: [shareA.id, shareB.id] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [staffA.id, applicant.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    console.log("\nCleaned up test data.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
