/** 한 줄 코칭 내러티브 — 대시보드·리포트·차수 요약 상단 */
export function NarrativeLead({
  text,
  label = "코칭 한 줄",
}: {
  text: string;
  label?: string;
}) {
  if (!text.trim()) return null;
  return (
    <div className="card-luxe border-gold/25 bg-gradient-to-r from-gold/8 to-transparent px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{label}</p>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">{text}</p>
    </div>
  );
}
