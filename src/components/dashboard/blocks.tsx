import clsx from "clsx";
import { money, moneyOrDash, num, numCompact, percent, safeDiv } from "@/lib/format";
import type { RankRow, Summary } from "@/lib/metrics";

/** Funil Meta → venda. Cada etapa mostra a taxa de passagem da anterior. */
export function Funnel({ s }: { s: Summary }) {
  const steps = [
    { label: "Impressões", value: s.impressions, rate: null as number | null, rateLabel: "" },
    { label: "Cliques no link", value: s.linkClicks, rate: s.ctr, rateLabel: "CTR" },
    { label: "Visualizações da página", value: s.landingPageViews, rate: safeDiv(s.landingPageViews, s.linkClicks), rateLabel: "Connect rate" },
    { label: "Checkouts iniciados", value: s.initiateCheckouts, rate: safeDiv(s.initiateCheckouts, s.landingPageViews), rateLabel: "Página → checkout" },
    { label: "Vendas aprovadas", value: s.approved.count, rate: safeDiv(s.approved.count, s.initiateCheckouts), rateLabel: "Conv. checkout" },
  ];
  // escala logarítmica suave: impressões são ordens de grandeza maiores que vendas
  const max = Math.log10(Math.max(steps[0].value, 10));
  return (
    <div className="flex flex-col gap-3 px-5 pb-5">
      {steps.map((st, i) => {
        const w = st.value > 0 ? Math.max((Math.log10(st.value + 1) / max) * 100, 4) : 0;
        return (
          <div key={st.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-text-2">{st.label}</span>
              <span className="flex items-baseline gap-2">
                {st.rate != null && (
                  <span className="text-xs text-muted" title={st.rateLabel}>
                    {st.rateLabel} {percent(st.rate)}
                  </span>
                )}
                <span className="font-semibold text-text tabular">{numCompact(st.value)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${w}%`, opacity: 1 - i * 0.12 }} />
            </div>
          </div>
        );
      })}
      <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
        {[
          ["CPM", moneyOrDash(s.cpm)],
          ["CPC", moneyOrDash(s.cpc)],
          ["Custo / checkout", moneyOrDash(s.costPerIc)],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-[11px] text-muted">{l}</p>
            <p className="text-sm font-semibold text-text tabular">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RankList({ rows, empty }: { rows: RankRow[]; empty: string }) {
  if (!rows.length) return <p className="px-5 pb-6 pt-2 text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <ul className="flex flex-col gap-3 px-5 pb-5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className={clsx("truncate", r.key === "__none" ? "italic text-muted" : "text-text")}>{r.label}</span>
            <span className="shrink-0 font-semibold text-text tabular">{money(r.value)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-s1" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right text-xs text-muted tabular">
              {num(r.count)} · {percent(r.value / total)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "Para onde foi o dinheiro": do faturamento bruto até o lucro. */
export function MoneyFlow({ s, taxRate }: { s: Summary; taxRate: number }) {
  const rows = [
    { label: "Faturamento bruto", value: s.grossRevenue, kind: "base" as const },
    { label: "Taxas da plataforma e comissões", value: -(s.grossRevenue - s.netRevenue), kind: "minus" as const },
    { label: "Gastos com anúncios", value: -s.adSpend, kind: "minus" as const },
    { label: `Impostos (${num(taxRate)}%)`, value: -s.taxes, kind: "minus" as const },
    { label: "Custo dos produtos", value: -s.productCosts, kind: "minus" as const },
  ];
  const base = Math.max(s.grossRevenue, 1);
  return (
    <div className="flex flex-col px-5 pb-5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 border-b border-border py-2.5 text-sm last:border-0">
          <span className="flex-1 text-text-2">{r.label}</span>
          <span className="w-16 text-right text-xs text-muted tabular">{percent(Math.abs(r.value) / base)}</span>
          <span className={clsx("w-28 text-right font-medium tabular", r.kind === "minus" ? "text-text-2" : "text-text")}>
            {r.kind === "minus" && r.value !== 0 ? "− " : ""}
            {money(Math.abs(r.value))}
          </span>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
        <span className="flex-1 font-semibold text-text">Lucro</span>
        <span className="w-16 text-right text-xs text-muted tabular">{percent(s.profit / base)}</span>
        <span className={clsx("w-28 text-right font-semibold tabular", s.profit >= 0 ? "text-good" : "text-bad")}>{money(s.profit)}</span>
      </div>
    </div>
  );
}
