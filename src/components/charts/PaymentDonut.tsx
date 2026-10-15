"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { money, num, percent } from "@/lib/format";
import type { PaymentRow } from "@/lib/metrics";

const COLOR: Record<string, string> = { pix: "var(--s3)", card: "var(--s1)", boleto: "var(--s4)", other: "var(--s-other)" };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: PaymentRow }[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-text">{r.label}</p>
      <p className="text-text-2">
        {num(r.count)} vendas · {money(r.value)}
      </p>
    </div>
  );
}

export function PaymentDonut({ rows }: { rows: PaymentRow[] }) {
  const total = rows.reduce((a, r) => a + r.count, 0);
  const data = rows.filter((r) => r.count > 0);

  return (
    <div className="flex flex-col items-center gap-5 px-5 pb-5">
      <div className="relative size-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ label: "—", count: 1, method: "none" }]}
              dataKey="count"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive={false}
            >
              {(data.length ? data : [{ method: "none" }]).map((r) => (
                <Cell key={r.method} fill={COLOR[r.method] ?? "var(--grid)"} />
              ))}
            </Pie>
            {data.length > 0 && <Tooltip content={<Tip />} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xl font-semibold text-text tabular">{num(total)}</p>
            <p className="text-[11px] text-muted">aprovadas</p>
          </div>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.method} className="flex items-start gap-2.5 text-sm">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-sm" style={{ background: COLOR[r.method] }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-text">{r.label}</span>
                <span className="whitespace-nowrap font-semibold text-text tabular">{num(r.count)}</span>
              </div>
              <div className="flex justify-between gap-2 text-xs text-muted tabular">
                <span title="Taxa de aprovação: pagas ÷ todas as tentativas com esse método">aprovação {percent(r.approvalRate)}</span>
                <span>{total ? percent(r.count / total) : "—"}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
