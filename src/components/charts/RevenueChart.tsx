"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, moneyCompact, num } from "@/lib/format";
import type { DailyPoint } from "@/lib/metrics";

const SERIES = [
  { key: "revenue", label: "Faturamento líquido", color: "var(--s1)" },
  { key: "spend", label: "Gastos com anúncios", color: "var(--s2)" },
  { key: "profit", label: "Lucro", color: "var(--s3)" },
] as const;

type Key = (typeof SERIES)[number]["key"];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: DailyPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="min-w-48 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-text">{label}</p>
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-text-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="font-medium text-text tabular">{money(p[s.key])}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-border pt-1 text-text-2">
        <span>Vendas</span>
        <span className="font-medium text-text tabular">{num(p.sales)}</span>
      </div>
    </div>
  );
}

export function RevenueChart({ data, hourly }: { data: DailyPoint[]; hourly: boolean }) {
  const [hidden, setHidden] = useState<Set<Key>>(new Set());
  const toggle = (k: Key) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 px-5">
        {SERIES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className="flex items-center gap-1.5 text-xs text-text-2 transition hover:text-text"
            style={{ opacity: hidden.has(s.key) ? 0.4 : 1 }}
            aria-pressed={!hidden.has(s.key)}
          >
            <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
      <div className="h-[280px] px-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="fy-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--s1)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--s1)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={hourly ? 12 : 24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickFormatter={(v) => moneyCompact(v).replace(",00", "")}
              width={72}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} />
            {!hidden.has("revenue") && (
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="revenue"
                stroke="var(--s1)"
                strokeWidth={2}
                fill="url(#fy-rev)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              />
            )}
            {!hidden.has("spend") && (
              <Line isAnimationActive={false} type="monotone" dataKey="spend" stroke="var(--s2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
            )}
            {!hidden.has("profit") && (
              <Line isAnimationActive={false} type="monotone" dataKey="profit" stroke="var(--s3)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
