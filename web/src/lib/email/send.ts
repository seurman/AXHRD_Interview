/**
 * 이메일 발송 — RESEND_API_KEY가 있으면 Resend REST API, 없으면 no-op(링크 복사용).
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "AXHRD <noreply@axhrd.com>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email:skip]", input.to, input.subject);
    }
    return { sent: false, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${input.text}</pre>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email:fail]", res.status, body);
    throw new Error("이메일 발송에 실패했습니다.");
  }
  return { sent: true };
}
