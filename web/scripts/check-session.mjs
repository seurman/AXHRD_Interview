import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const s = await p.interviewSession.findFirst({
  where: { status: "IN_PROGRESS" },
  orderBy: { createdAt: "desc" },
  include: {
    responses: true,
    plan: { include: { competencyProgress: true } },
  },
});
console.log(JSON.stringify(s, null, 2));
await p.$disconnect();
