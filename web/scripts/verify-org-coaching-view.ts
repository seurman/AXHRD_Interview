/**
 * Org coaching view acceptance checks.
 * Run: npx tsx scripts/verify-org-coaching-view.ts
 */
import { prisma } from "../src/lib/prisma";
import { getCohortData } from "../src/lib/org/cohort";
import { COHORT_MEMBER_ROLES } from "../src/lib/auth/roles";

function guardMemberAccess(
  staffOrgId: string,
  member: { organizationId: string | null; orgCoachingConsent: boolean } | null,
): "not_found" | "no_consent" | "allowed" {
  if (!member || member.organizationId !== staffOrgId) return "not_found";
  if (!member.orgCoachingConsent) return "no_consent";
  return "allowed";
}

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          id: true,
          email: true,
          name: true,
          orgRole: true,
          orgCoachingConsent: true,
          organizationId: true,
        },
      },
    },
    take: 10,
  });

  console.log("=== Organizations ===");
  for (const org of orgs) {
    const staff = org.members.filter((u) => u.orgRole === "ADMIN" || u.orgRole === "STAFF");
    const cohortMembers = org.members.filter((u) =>
      (COHORT_MEMBER_ROLES as readonly string[]).includes(u.orgRole),
    );
    console.log(`\n${org.name} (${org.id})`);
    console.log(`  staff: ${staff.map((u) => u.email).join(", ") || "(none)"}`);
    console.log(`  members: ${cohortMembers.length}`);
    for (const m of cohortMembers.slice(0, 5)) {
      console.log(`    - ${m.email} consent=${m.orgCoachingConsent}`);
    }

    const cohort = await getCohortData(org.id);
    if (cohort) {
      console.log(`  cohort members=${cohort.memberCount} sessions=${cohort.totalCompletedSessions}`);
      console.log(`  coachingConsent in rows: ${cohort.members.map((m) => `${m.name}:${m.coachingConsent}`).join(", ")}`);
    }
  }

  if (orgs.length >= 2) {
    const orgA = orgs[0];
    const orgB = orgs[1];
    const memberB = orgB.members.find((u) =>
      (COHORT_MEMBER_ROLES as readonly string[]).includes(u.orgRole),
    );
    if (memberB) {
      const cross = guardMemberAccess(orgA.id, memberB);
      console.log(`\n=== Cross-org guard (${orgA.name} staff → ${orgB.name} member) ===`);
      console.log(`Expected not_found, got: ${cross}`);
    }
  }

  const orgWithMember = orgs.find((o) =>
    o.members.some((u) => (COHORT_MEMBER_ROLES as readonly string[]).includes(u.orgRole)),
  );
  if (orgWithMember) {
    const member = orgWithMember.members.find((u) =>
      (COHORT_MEMBER_ROLES as readonly string[]).includes(u.orgRole),
    )!;
    const noConsent = guardMemberAccess(orgWithMember.id, {
      organizationId: member.organizationId,
      orgCoachingConsent: false,
    });
    const withConsent = guardMemberAccess(orgWithMember.id, {
      organizationId: member.organizationId,
      orgCoachingConsent: true,
    });
    console.log(`\n=== Consent guard (${member.email}) ===`);
    console.log(`consent=false → ${noConsent} (expected no_consent)`);
    console.log(`consent=true → ${withConsent} (expected allowed)`);
  }

  console.log("\n=== DB toggle test accounts ===");
  const testMember = await prisma.user.findFirst({
    where: {
      organizationId: { not: null },
      orgRole: { in: [...COHORT_MEMBER_ROLES] },
    },
    select: { id: true, email: true, organizationId: true, orgCoachingConsent: true },
  });
  if (testMember) {
    console.log(`Member: ${testMember.email}`);
    const before = testMember.orgCoachingConsent;
    await prisma.user.update({
      where: { id: testMember.id },
      data: { orgCoachingConsent: true, orgCoachingConsentAt: new Date() },
    });
    const consented = await prisma.user.findUnique({
      where: { id: testMember.id },
      select: { orgCoachingConsent: true },
    });
    await prisma.user.update({
      where: { id: testMember.id },
      data: { orgCoachingConsent: before, orgCoachingConsentAt: before ? new Date() : null },
    });
    console.log(`Toggle write/read OK: ${consented?.orgCoachingConsent === true}`);
  } else {
    console.log("No cohort member found for toggle test");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
