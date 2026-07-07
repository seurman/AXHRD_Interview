import { Suspense } from "react";
import { BillingFailClient } from "@/components/billing/BillingFailClient";

export default function BillingFailPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted">…</p>}>
      <BillingFailClient />
    </Suspense>
  );
}
