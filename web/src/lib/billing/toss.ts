/** 토스페이먼츠 REST API 클라이언트 — 시크릿 키는 서버 전용 */

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  const encoded = Buffer.from(`${secret}:`).toString("base64");
  return `Basic ${encoded}`;
}

async function tossFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    ...(init?.json ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    ...init,
    headers,
    body: init?.json ? JSON.stringify(init.json) : init?.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { message?: string }).message ??
      (data as { code?: string }).code ??
      `Toss API ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export type TossBillingKeyIssueResponse = {
  billingKey: string;
  customerKey: string;
  authenticatedAt?: string;
  cardCompany?: string;
  cardNumber?: string;
};

/** authKey + customerKey → billingKey 발급 */
export async function issueBillingKey(params: {
  authKey: string;
  customerKey: string;
}): Promise<TossBillingKeyIssueResponse> {
  return tossFetch<TossBillingKeyIssueResponse>("/billing/authorizations/issue", {
    method: "POST",
    json: params,
  });
}

export type TossBillingPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
};

/** 빌링키로 자동결제 승인 */
export async function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<TossBillingPaymentResponse> {
  const { billingKey, ...body } = params;
  return tossFetch<TossBillingPaymentResponse>(`/billing/${billingKey}`, {
    method: "POST",
    json: body,
  });
}

export type TossPaymentQueryResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
};

/** 웹훅 PAYMENT_STATUS_CHANGED — paymentKey로 서버 재조회(서명 없는 웹훅 검증) */
export async function getPayment(paymentKey: string): Promise<TossPaymentQueryResponse> {
  return tossFetch<TossPaymentQueryResponse>(`/payments/${paymentKey}`, {
    method: "GET",
  });
}

export function getTossClientKey(): string {
  const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? process.env.TOSS_CLIENT_KEY;
  if (!key) throw new Error("TOSS_CLIENT_KEY가 설정되지 않았습니다.");
  return key;
}
