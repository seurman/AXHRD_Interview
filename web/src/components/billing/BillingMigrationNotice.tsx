import Link from "next/link";
import { BILLING_MIGRATION } from "@/lib/billing/errors";

export function BillingMigrationNotice() {
  return (
    <div className="mx-auto max-w-2xl card-luxe border-amber-500/30 p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-amber-400">Setup required</p>
      <h1 className="mt-1 text-lg font-bold text-foreground">구독 DB 마이그레이션이 필요합니다</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <code className="text-foreground">{BILLING_MIGRATION}</code> 마이그레이션이 운영 DB에
        아직 적용되지 않았습니다. Supabase URL을 설정한 뒤 아래 명령을 실행해 주세요.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-background p-3 text-xs text-muted">
        {`cd web
$env:DATABASE_URL="<Supabase Transaction pooler>"
$env:DIRECT_URL="<Supabase Session pooler>"
npx.cmd prisma migrate deploy`}
      </pre>
      <Link href="/admin/users" className="mt-4 inline-block text-sm text-accent hover:underline">
        ← 관리 메뉴로
      </Link>
    </div>
  );
}
