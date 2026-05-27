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
import type { IslandMetricSnapshot } from "@/lib/types";

interface Props {
  history: IslandMetricSnapshot[];
  metric: keyof Pick<IslandMetricSnapshot, "peak_ccu" | "plays" | "unique_players" | "favorites">;
  label: string;
  color?: string;
}

export default function StatsChart({ history, metric, label, color = "#6C63FF" }: Props) {
  const data = [...history]
    .reverse()
    .map((snap) => ({
      time: new Date(snap.recorded_at).toLocaleTimeString("ar", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: snap[metric] ?? 0,
    }));

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted text-sm">
        لا توجد بيانات كافية
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="time" tick={{ fill: "#8B8BA7", fontSize: 11 }} tickLine={false} />
        <YAxis
          tick={{ fill: "#8B8BA7", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
        />
        <Tooltip
          contentStyle={{ background: "#252540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          labelStyle={{ color: "#fff" }}
          itemStyle={{ color }}
          formatter={(v: number) => [v.toLocaleString(), label]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
