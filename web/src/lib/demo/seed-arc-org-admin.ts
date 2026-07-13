import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { SHOWCASE_ORG_NAME } from "@/lib/platform/showcase-org";
import access from "@/data/demo/demo-access.json";

/** 쇼케이스 기관(풀 SKU)에 기관 관리자 계정 연결 — 조직진단·지원자 결과 시연용 */
export async function seedArcDemoOrgAdmin(client: PrismaClient) {
  const account = access.accounts.find((a) => a.id === "org_full");
  if (!account || !("email" in account) || !account.email) {
    throw new Error("demo-access.json: org_full account missing");
  }

  const email = account.email;
  const name = account.name ?? "AXHRD 데모관리자";

  const org = await client.organization.findFirst({
    where: { name: SHOWCASE_ORG_NAME },
  });

  if (!org) {
    return {
      email,
      organizationId: null,
      reason: "showcase org not found — run seedShowcaseDemoData first",
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
    candidatesUrl: "/org/candidates",
    orgDashboardUrl: "/org/dashboard",
  };
}
