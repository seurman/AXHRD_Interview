import { NextResponse } from "next/server";
import { enrichCompany, COMPANY_PRESETS } from "@/lib/company/enrich";
import { companySizeLabel } from "@/lib/utils";

export async function POST(req: Request) {
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Company name required" }, { status: 400 });
  }

  const context = await enrichCompany(name);

  return NextResponse.json({
    ...context,
    sizeLabel: companySizeLabel(context.size),
    isKnown: name.trim() in COMPANY_PRESETS,
  });
}
