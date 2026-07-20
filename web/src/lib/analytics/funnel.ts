/** 면접 퍼널 이벤트 — 벤더 없이 클라이언트 버퍼 + 서버 로그 */

export type FunnelEvent =
  | "interview_setup_done"
  | "interview_answer"
  | "interview_leave"
  | "interview_resume"
  | "interview_next_competency";

export type FunnelProps = Record<string, string | number | boolean | null | undefined>;

export function trackFunnel(event: FunnelEvent, props: FunnelProps = {}): void {
  if (typeof window === "undefined") return;
  const payload = { event, props, t: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent("axhrd:funnel", { detail: payload }));
    const key = "axhrd_funnel";
    const prev = JSON.parse(sessionStorage.getItem(key) ?? "[]") as unknown[];
    const next = [...prev, payload].slice(-40);
    sessionStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
