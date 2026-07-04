import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const q = await p.question.findUnique({
  where: { externalId: "LD-L1-001" },
});
console.log(q);
await p.$disconnect();
