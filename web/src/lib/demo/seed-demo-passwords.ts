import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import access from "@/data/demo/demo-access.json";

/** @demo.axhrd.local 시연 계정에 공통 비밀번호 설정 */
export async function ensureDemoAccountPasswords(client: PrismaClient) {
  const password = access.defaultPassword;
  const emails = access.accounts
    .filter((a): a is typeof a & { email: string; password?: string } => "email" in a && !!a.email)
    .map((a) => ({
      email: a.email,
      password: "password" in a && a.password ? a.password : password,
    }));

  const updated: string[] = [];
  for (const { email, password: pw } of emails) {
    const user = await client.user.findUnique({ where: { email } });
    if (!user) continue;
    await client.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(pw) },
    });
    updated.push(email);
  }

  return { updated, defaultPassword: password };
}
