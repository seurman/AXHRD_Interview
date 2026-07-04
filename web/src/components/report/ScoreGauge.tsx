/**
 * 0~100 값을 원형 게이지로 표시하는 순수 SVG 컴포넌트.
 * 상호작용이 없어 서버 컴포넌트에서도 그대로 사용 가능.
 */
export function ScoreGauge({
  value,
  size = 112,
  label = "백분위",
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-card-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(clamped)}</span>
        <span className="text-[11px] text-muted">{label}</span>
      </div>
    </div>
  );
}
