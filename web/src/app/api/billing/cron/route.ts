import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chargeSubscription } from "@/lib/billing/charge";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const due = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE"] },
      cancelAtPeriodEnd: false,
      billingKey: { not: null },
      currentPeriodEnd: { gte: startOfDay, lt: endOfDay },
    },
  });

  const results: Array<{ id: string; ok: boolean; detail?: string }> = [];

  for (const sub of due) {
    try {
      const result = await chargeSubscription(sub.id);
      if ("skipped" in result && result.skipped) {
        results.push({ id: sub.id, ok: true, detail: result.reason });
      } else if (result.ok) {
        results.push({ id: sub.id, ok: true });
      } else {
        results.push({ id: sub.id, ok: false, detail: result.failReason });
      }
    } catch (e) {
      results.push({
        id: sub.id,
        ok: false,
        detail: e instanceof Error ? e.message : "charge error",
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    ranAt: now.toISOString(),
  });
}
