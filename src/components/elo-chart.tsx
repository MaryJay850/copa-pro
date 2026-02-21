"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getEloHistory } from "@/lib/actions";

type EloEntry = {
  id: string;
  oldRating: number;
  newRating: number;
  change: number;
  createdAt: string;
};

type ChartData = {
  date: string;
  rating: number;
  change: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartData;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{d.date}</p>
      <p>Rating: <span className="font-bold">{d.rating}</span></p>
      <p>
        Variacao:{" "}
        <span className={d.change >= 0 ? "text-emerald-600" : "text-red-500"}>
          {d.change >= 0 ? `+${d.change}` : d.change}
        </span>
      </p>
    </div>
  );
}

export function EloChart({
  playerId,
  currentRating,
}: {
  playerId: string;
  currentRating: number;
}) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEloHistory(playerId)
      .then((history: EloEntry[]) => {
        const mapped = history.map((h) => ({
          date: new Date(h.createdAt).toLocaleDateString("pt-PT", {
            day: "2-digit",
            month: "2-digit",
          }),
          rating: h.newRating,
          change: h.change,
        }));
        setData(mapped);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[250px] text-text-muted text-sm">
        A carregar...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-text-muted text-sm">
        Sem dados de Elo ainda.
      </div>
    );
  }

  return (
    <div>
      <p className="text-center text-sm text-text-muted mb-2">
        Rating Atual:{" "}
        <span className="text-xl font-bold text-primary">{currentRating}</span>
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
