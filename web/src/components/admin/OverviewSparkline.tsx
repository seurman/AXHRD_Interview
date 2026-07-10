"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { HourlyBucket } from "@/lib/admin/platform-home-data";

export function OverviewSparkline({ data, color }: { data: HourlyBucket[]; color: string }) {
  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-12 items-end gap-0.5 opacity-40">
        {data.map((d) => (
          <div key={d.label} className="h-1 flex-1 rounded-sm bg-muted" title={d.label} />
        ))}
      </div>
    );
  }

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
