import { NextResponse } from "next/server";
import {
  auditActor,
  isAdminResponse,
  requirePlatformAdminApi,
} from "@/lib/admin/auth";
import {
  applyIrtRecalibration,
  computeIrtRecalibration,
} from "@/lib/admin/irt-recalibration";

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = (await req.json().catch(() => ({}))) as { apply?: boolean };
  const results = await computeIrtRecalibration();

  if (body.apply === true) {
    const { appliedCount } = await applyIrtRecalibration(results, auditActor(auth));
    return NextResponse.json({ results, applied: true, appliedCount });
  }

  return NextResponse.json({ results, applied: false });
}
