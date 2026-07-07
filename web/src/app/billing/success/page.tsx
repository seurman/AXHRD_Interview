import { Suspense } from "react";
import { BillingSuccessClient } from "@/components/billing/BillingSuccessClient";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted">처리 중…</p>}>
      <BillingSuccessClient />
    </Suspense>
  );
}
