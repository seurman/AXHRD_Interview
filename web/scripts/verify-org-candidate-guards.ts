/**
 * Guard logic verification (no HTTP). Run: npx tsx scripts/verify-org-candidate-guards.ts
 */
import { prisma } from "../src/lib/prisma";
import { randomBytes } from "crypto";
import { generateKitShareSlug } from "../src/lib/org/kit-share";

function assertShareAccess(
  staffOrgId: string,
  share: { organizationId: string } | null,
): boolean {
  return !!share && share.organizationId === staffOrgId;
}

function assertSessionAccess(
  staffOrgId: string,
  session: { kitOrganizationId: string | null; status: string } | null,
): boolean {
  return (
    !!session &&
    session.kitOrganizationId === staffOrgId &&
    session.status === "COMPLETED"
  );
}

async function main() {
  const tag = `guard-${Date.now()}`;
  const orgA = await prisma.organization.create({
    data: {
      name: `A ${tag}`,
      joinCode: `GA${randomBytes(2).toString("hex").toUpperCase()}`,
      status: "APPROVED",
      approvedAt: new Date(),
      saasPersonalizationEnabled: true,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: `B ${tag}`,
      joinCode: `GB${randomBytes(2).toString("hex").toUpperCase()}`,
      status: "APPROVED",
      approvedAt: new Date(),
      saasPersonalizationEnabled: true,
    },
  });
  const user = await prisma.user.create({
    data: {
      email: `${tag}@test.local`,
      name: "Applicant",
      dataUseConsentAt: new Date(),
    },
  });
  const shareA = await prisma.orgInterviewKitShare.create({
    data: { organizationId: orgA.id, slug: generateKitShareSlug(), label: "A" },
  });
  const shareB = await prisma.orgInterviewKitShare.create({
    data: { organizationId: orgB.id, slug: generateKitShareSlug(), label: "B" },
  });
  const sessionA = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      sessionNumber: 1,
      status: "COMPLETED",
      kitOrganizationId: orgA.id,
      orgKitShareId: shareA.id,
    },
  });
  const sessionB = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      sessionNumber: 2,
      status: "COMPLETED",
      kitOrganizationId: orgB.id,
      orgKitShareId: shareB.id,
    },
  });

  try {
    console.log("Share A from org A staff:", assertShareAccess(orgA.id, shareA));
    console.log("Share B from org A staff:", assertShareAccess(orgA.id, shareB));
    console.log("Session A from org A staff:", assertSessionAccess(orgA.id, sessionA));
    console.log("Session B from org A staff:", assertSessionAccess(orgA.id, sessionB));
    console.log(
      "Schema relation: OrgInterviewKitShare.sessions field exists via",
      sessionA.orgKitShareId === shareA.id ? "orgKitShareId ✓" : "✗",
    );
  } finally {
    await prisma.interviewSession.deleteMany({ where: { id: { in: [sessionA.id, sessionB.id] } } });
    await prisma.orgInterviewKitShare.deleteMany({ where: { id: { in: [shareA.id, shareB.id] } } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  }
}

main().finally(() => prisma.$disconnect());
