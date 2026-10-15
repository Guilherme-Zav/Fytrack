"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, num } from "@/lib/format";

interface Row {
  hour: number;
  label: string;
  count: number;
  value: number;
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-text">
        {r.label} – {String(r.hour + 1).padStart(2, "0")}h
      </p>
      <p className="text-text-2">
        {num(r.count)} vendas · {money(r.value)}
      </p>
    </div>
  );
}

export function HourBars({ data }: { data: Row[] }) {
  const peak = data.reduce((m, r) => (r.count > m.count ? r : m), data[0]);
  return (
    <div className="px-2 pb-3">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} interval={2} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <Tooltip content={<Tip />} cursor={{ fill: "var(--surface-hover)" }} />
            <Bar isAnimationActive={false} dataKey="count" fill="var(--s1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {peak?.count > 0 && (
        <p className="px-3 pt-1 text-xs text-text-2">
          Pico de vendas às <b className="text-text">{peak.label}</b> ({num(peak.count)} vendas)
        </p>
      )}
    </div>
  );
}
