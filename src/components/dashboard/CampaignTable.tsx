"use client";

import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AdStatusBadge } from "@/components/ui";
import { money, moneyOrDash, num, percent, ratio } from "@/lib/format";
import type { AdRow } from "@/lib/metrics";

type Col = {
  key: keyof AdRow;
  label: string;
  fmt: (r: AdRow) => string;
  tone?: (r: AdRow) => string | undefined;
  title?: string;
};

const COLS: Col[] = [
  { key: "budget", label: "Orçamento", fmt: (r) => moneyOrDash(r.budget), title: "Orçamento diário" },
  { key: "spend", label: "Gastos", fmt: (r) => money(r.spend) },
  { key: "sales", label: "Vendas", fmt: (r) => num(r.sales) },
  { key: "cpa", label: "CPA", fmt: (r) => moneyOrDash(r.cpa) },
  { key: "revenue", label: "Faturamento", fmt: (r) => money(r.revenue), title: "Faturamento líquido" },
  { key: "profit", label: "Lucro", fmt: (r) => money(r.profit), tone: (r) => (r.profit >= 0 ? "text-good" : "text-bad") },
  {
    key: "roas",
    label: "ROAS",
    fmt: (r) => ratio(r.roas),
    tone: (r) => (r.roas == null ? undefined : r.roas >= 2 ? "text-good" : r.roas < 1 ? "text-bad" : undefined),
  },
  { key: "margin", label: "Margem", fmt: (r) => percent(r.margin) },
  { key: "roi", label: "ROI", fmt: (r) => percent(r.roi) },
  { key: "ic", label: "IC", fmt: (r) => num(r.ic), title: "Checkouts iniciados (Meta)" },
  { key: "checkoutRate", label: "Conv. checkout", fmt: (r) => percent(r.checkoutRate), title: "Vendas ÷ checkouts iniciados" },
  { key: "cpc", label: "CPC", fmt: (r) => moneyOrDash(r.cpc), title: "Custo por clique no link" },
  { key: "ctr", label: "CTR", fmt: (r) => percent(r.ctr), title: "Cliques no link ÷ impressões" },
  { key: "cpm", label: "CPM", fmt: (r) => moneyOrDash(r.cpm) },
  { key: "connectRate", label: "Connect rate", fmt: (r) => percent(r.connectRate), title: "Visualizações da página ÷ cliques no link" },
  { key: "impressions", label: "Impressões", fmt: (r) => num(r.impressions) },
];

export function CampaignTable({ rows, levelLabel, showParent }: { rows: AdRow[]; levelLabel: string; showParent: boolean }) {
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [sort, setSort] = useState<{ key: keyof AdRow; dir: 1 | -1 }>({ key: "spend", dir: -1 });

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => !term || r.name.toLowerCase().includes(term) || r.parentName?.toLowerCase().includes(term))
      .filter((r) => !onlyActive || r.status === "ACTIVE")
      .sort((a, b) => {
        const av = a[sort.key] ?? -Infinity;
        const bv = b[sort.key] ?? -Infinity;
        if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv)) * sort.dir;
        return ((av as number) - (bv as number)) * sort.dir;
      });
  }, [rows, q, onlyActive, sort]);

  const totals = useMemo(() => {
    const t = visible.reduce(
      (a, r) => ({
        spend: a.spend + r.spend,
        sales: a.sales + r.sales,
        revenue: a.revenue + r.revenue,
        profit: a.profit + r.profit,
        ic: a.ic + r.ic,
        impressions: a.impressions + r.impressions,
      }),
      { spend: 0, sales: 0, revenue: 0, profit: 0, ic: 0, impressions: 0 },
    );
    return t;
  }, [visible]);

  const header = (key: keyof AdRow, label: string, title?: string, align = "text-right") => (
    <th className={clsx("whitespace-nowrap px-3 py-2.5 font-medium", align)} title={title}>
      <button
        className={clsx("inline-flex items-center gap-1 hover:text-text", sort.key === key && "text-text")}
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }))}
      >
        {label}
        {sort.key === key && (sort.dir === -1 ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />)}
      </button>
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Buscar ${levelLabel.toLowerCase()}…`}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          Só ativos
        </label>
        <span className="ml-auto text-xs text-muted">{num(visible.length)} itens</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px] text-sm">
          <thead>
            <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
              <th className="sticky left-0 z-10 bg-surface-2 px-5 py-2.5 font-medium">Status</th>
              {header("name", levelLabel, undefined, "text-left")}
              {COLS.map((c) => header(c.key, c.label, c.title))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="group border-b border-border hover:bg-surface-hover">
                <td className="sticky left-0 z-10 bg-surface px-5 py-2.5 group-hover:bg-surface-hover">
                  <AdStatusBadge status={r.status} />
                </td>
                <td className="max-w-[340px] px-3 py-2.5">
                  <p className="truncate font-medium text-text" title={r.name}>
                    {r.name}
                  </p>
                  {showParent && r.parentName && <p className="truncate text-xs text-muted">{r.parentName}</p>}
                </td>
                {COLS.map((c) => (
                  <td key={c.key} className={clsx("whitespace-nowrap px-3 py-2.5 text-right tabular", c.tone?.(r) ?? "text-text-2")}>
                    {c.fmt(r)}
                  </td>
                ))}
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={COLS.length + 2} className="px-5 py-10 text-center text-muted">
                  Nada encontrado para esse período e filtros.
                </td>
              </tr>
            )}
          </tbody>
          {visible.length > 0 && (
            <tfoot>
              <tr className="bg-surface-2 text-sm font-semibold text-text">
                <td className="sticky left-0 bg-surface-2 px-5 py-3">Total</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right tabular">{money(totals.spend)}</td>
                <td className="px-3 py-3 text-right tabular">{num(totals.sales)}</td>
                <td className="px-3 py-3 text-right tabular">{moneyOrDash(totals.sales ? totals.spend / totals.sales : null)}</td>
                <td className="px-3 py-3 text-right tabular">{money(totals.revenue)}</td>
                <td className={clsx("px-3 py-3 text-right tabular", totals.profit >= 0 ? "text-good" : "text-bad")}>{money(totals.profit)}</td>
                <td className="px-3 py-3 text-right tabular">{ratio(totals.spend ? totals.revenue / totals.spend : null)}</td>
                <td className="px-3 py-3 text-right tabular">{percent(totals.revenue ? totals.profit / totals.revenue : null)}</td>
                <td colSpan={COLS.length - 8} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
