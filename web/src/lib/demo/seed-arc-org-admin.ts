import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import access from "@/data/demo/demo-access.json";

const ARC_DEMO_JOIN_CODE = "ARC-DEMO-2026";
const ARC_DEMO_ORG_NAME = "테크노바 (ARC 데모)";

/** 테크노바 ARC 데모 기관에 기관 관리자 계정 연결 — /org/diagnosis 시연용 */
export async function seedArcDemoOrgAdmin(client: PrismaClient) {
  const account = access.accounts.find((a) => a.id === "org_diagnostic");
  if (!account || !("email" in account) || !account.email) {
    throw new Error("demo-access.json: org_diagnostic account missing");
  }

  const email = account.email;
  const name = account.name ?? "테크노바 데모관리자";

  const org = await client.organization.findFirst({
    where: { OR: [{ joinCode: ARC_DEMO_JOIN_CODE }, { name: ARC_DEMO_ORG_NAME }] },
  });

  if (!org) {
    return {
      email,
      organizationId: null,
      reason: "ARC demo org not found — run seedDemoArcIndex first",
    };
  }

  const password =
    "password" in account && account.password ? account.password : access.defaultPassword;

  const user = await client.user.upsert({
    where: { email },
    update: {
      name,
      organizationId: org.id,
      orgRole: "ADMIN",
      passwordHash: hashPassword(password),
      dataUseConsentAt: new Date(),
    },
    create: {
      email,
      name,
      organizationId: org.id,
      orgRole: "ADMIN",
      passwordHash: hashPassword(password),
      dataUseConsentAt: new Date(),
    },
  });

  return {
    userId: user.id,
    email,
    password,
    organizationId: org.id,
    organizationName: org.name,
    joinCode: org.joinCode,
    orgDiagnosisUrl: "/org/diagnosis",
  };
}
