/**
 * HTTP access test for org coaching view.
 * Requires dev server: npm run dev (default http://localhost:3000 or 3001)
 * Run: npx tsx scripts/test-org-coaching-access.ts
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { getCohortData } from "../src/lib/org/cohort";
import { randomBytes } from "crypto";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PASSWORD = "coaching-test-123";
const TAG = `coaching-access-${Date.now()}`;

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

  const orgA = await prisma.organization.create({
    data: {
      name: `Test Org A ${TAG}`,
      joinCode: `TA${randomBytes(3).toString("hex").toUpperCase()}`,
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: `Test Org B ${TAG}`,
      joinCode: `TB${randomBytes(3).toString("hex").toUpperCase()}`,
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const staffEmail = `${TAG}-staff@test.local`;
  const memberNoConsentEmail = `${TAG}-member-no@test.local`;
  const memberConsentEmail = `${TAG}-member-yes@test.local`;
  const otherOrgMemberEmail = `${TAG}-other@test.local`;

  const staff = await prisma.user.create({
    data: {
      email: staffEmail,
      name: "Staff Admin",
      passwordHash,
      organizationId: orgA.id,
      orgRole: "ADMIN",
      dataUseConsentAt: new Date(),
    },
  });
  const memberNo = await prisma.user.create({
    data: {
      email: memberNoConsentEmail,
      name: "Student No Consent",
      passwordHash,
      organizationId: orgA.id,
      orgRole: "MEMBER",
      orgCoachingConsent: false,
      dataUseConsentAt: new Date(),
    },
  });
  const memberYes = await prisma.user.create({
    data: {
      email: memberConsentEmail,
      name: "Student With Consent",
      passwordHash,
      organizationId: orgA.id,
      orgRole: "MEMBER",
      orgCoachingConsent: true,
      orgCoachingConsentAt: new Date(),
      dataUseConsentAt: new Date(),
    },
  });
  const otherMember = await prisma.user.create({
    data: {
      email: otherOrgMemberEmail,
      name: "Other Org Student",
      passwordHash,
      organizationId: orgB.id,
      orgRole: "MEMBER",
      orgCoachingConsent: true,
      orgCoachingConsentAt: new Date(),
      dataUseConsentAt: new Date(),
    },
  });

  try {
    const cohortBefore = await getCohortData(orgA.id);
    console.log("Cohort aggregate (consent mixed):", {
      memberCount: cohortBefore?.memberCount,
      members: cohortBefore?.members.map((m) => ({
        name: m.name,
        coachingConsent: m.coachingConsent,
      })),
    });

    const staffCookie = await login(staffEmail);

    const noConsentPage = await fetchPage(
      staffCookie,
      `/org/dashboard/members/${memberNo.id}`,
    );
    const yesConsentPage = await fetchPage(
      staffCookie,
      `/org/dashboard/members/${memberYes.id}`,
    );
    const crossOrgPage = await fetchPage(
      staffCookie,
      `/org/dashboard/members/${otherMember.id}`,
    );

    console.log("\n=== HTTP access results ===");
    console.log(
      "No consent member:",
      noConsentPage.status,
      noConsentPage.html.includes("동의하지 않은") ? "✓ consent message" : "✗ missing message",
      noConsentPage.html.includes("CompetencyDashboard") || noConsentPage.html.includes("역량 레이더")
        ? "✗ leaked dashboard"
        : "✓ no dashboard",
    );
    console.log(
      "Consented member:",
      yesConsentPage.status,
      yesConsentPage.html.includes("Coaching view") ? "✓ coaching header" : "✗ no header",
      yesConsentPage.html.includes("QuestPanel") ? "✗ quest panel leaked" : "✓ no quest panel",
    );
    console.log(
      "Cross-org member:",
      crossOrgPage.status === 404 ? "✓ 404" : `✗ status ${crossOrgPage.status}`,
      crossOrgPage.html.includes("could not be found") ? "(404 page body)" : "",
      crossOrgPage.html.includes("동의하지 않은") ? "(wrong: consent msg)" : "",
      crossOrgPage.html.includes("Coaching view") ? "(wrong: coaching view)" : "",
    );

    const orgDash = await fetchPage(staffCookie, "/org/dashboard");
    console.log(
      "Org dashboard table:",
      orgDash.html.includes("비공개") ? "✓ private badge" : "✗ no private badge",
      orgDash.html.includes("상세 보기") ? "✓ detail link" : "✗ no detail link",
    );
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [staff.id, memberNo.id, memberYes.id, otherMember.id] } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    console.log("\nCleaned up test org/users.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
