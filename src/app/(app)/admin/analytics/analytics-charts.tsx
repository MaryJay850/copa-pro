"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type AnalyticsData = {
  usersByMonth: { month: string; count: number }[];
  matchesByWeek: { week: string; count: number }[];
  eloDistribution: { range: string; count: number }[];
  topElo: { name: string; elo: number }[];
};

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Users per month */}
      {data.usersByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registos por Mes</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.usersByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Registos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Matches per week */}
      {data.matchesByWeek.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jogos por Semana</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.matchesByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Jogos" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Elo Distribution */}
      {data.eloDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuicao Elo</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.eloDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Jogadores" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top Elo */}
      {data.topElo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Elo</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.topElo.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-muted w-6">{i + 1}.</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <span className="text-sm font-bold text-primary">{p.elo}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
