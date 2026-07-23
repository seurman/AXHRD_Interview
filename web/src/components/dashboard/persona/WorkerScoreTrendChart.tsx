"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WorkerScoreTrendPoint } from "@/lib/dashboard/get-worker-dashboard-data";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function WorkerScoreTrendChart({ points }: { points: WorkerScoreTrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">
        완료한 평가가 2회 이상 쌓이면 점수 추이가 여기 표시됩니다.
      </p>
    );
  }

  const data = points.map((p) => ({ label: formatDate(p.at), score: p.score }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
        <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
        <YAxis domain={[1, 5]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-card-border)",
            borderRadius: 8,
          }}
          formatter={(value: number) => [`${value.toFixed(1)} / 5`, "점수"]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--color-gold)"
          strokeWidth={2}
          dot={{ r: 5, fill: "var(--color-gold)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
