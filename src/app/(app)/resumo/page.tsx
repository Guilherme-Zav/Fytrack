import clsx from "clsx";
import {
  BadgePercent,
  CircleDollarSign,
  Clock,
  Megaphone,
  Percent,
  RotateCcw,
  ShoppingCart,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { HourBars } from "@/components/charts/HourBars";
import { PaymentDonut } from "@/components/charts/PaymentDonut";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { Funnel, MoneyFlow, RankList } from "@/components/dashboard/blocks";
import { FilterBar } from "@/components/shell/FilterBar";
import { AdStatusBadge, Card, CardHeader, PageHeader, StatTile } from "@/components/ui";
import { describeRange } from "@/lib/dates";
import { money, moneyOrDash, num, percent, ratio } from "@/lib/format";
import { adRows, byPayment, deltaOf, rankBy, salesByHour, summarize, timeSeries } from "@/lib/metrics";
import { loadPage } from "@/lib/page-data";

export const dynamic = "force-dynamic";

export default async function ResumoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { filters, shell, ds, current, previous } = await loadPage(searchParams, true);

  const s = summarize(current.sales, current.insights, ds);
  const p = previous ? summarize(previous.sales, previous.insights, ds) : null;
  const d = (k: keyof typeof s) => deltaOf(s[k] as number | null, p ? (p[k] as number | null) : null);

  const series = timeSeries(current.sales, current.insights, ds, filters.from, filters.to);
  const payments = byPayment(current.sales);
  const products = rankBy(current.sales, (x) => x.product_id, (x) => x.product_name ?? "Produto sem nome");
  const sources = rankBy(current.sales, (x) => (x.utm_source ? x.utm_source.toLowerCase() : null), (x) => x.utm_source!);
  const hours = salesByHour(current.sales);
  const topCampaigns = adRows(current.sales, current.insights, ds, "campaign").slice(0, 5);

  return (
    <>
      <PageHeader title="Resumo" subtitle={`${describeRange(filters.from, filters.to)} · comparado ao período anterior`} />
      <div className="mb-5">
        <FilterBar filters={filters} accounts={shell.accounts} products={shell.products} sources={shell.sources} />
      </div>

      {/* ── Destaque + indicadores principais ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div
          className="relative overflow-hidden rounded-[14px] p-5 text-white shadow-lg lg:col-span-5"
          style={{ background: "var(--hero-bg)" }}
        >
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Wallet className="size-4" /> Lucro líquido
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <span className="text-[36px] font-semibold leading-none sm:text-[44px] tracking-tight tabular">{money(s.profit)}</span>
              {d("profit") != null && (
                <span className="mb-1 rounded-md bg-white/15 px-1.5 py-0.5 text-xs font-medium tabular">
                  {d("profit")! >= 0 ? "▲" : "▼"} {percent(Math.abs(d("profit")!))}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/75">Margem de {percent(s.margin)} sobre o faturamento líquido</p>
            <div className="mt-auto grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
              {[
                ["Faturamento líquido", money(s.netRevenue)],
                ["Gastos com anúncios", money(s.adSpend)],
                ["ROAS", ratio(s.roas)],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0">
                  <p className="truncate text-xs text-white/70">{l}</p>
                  <p className="truncate text-[14px] font-semibold tabular sm:text-[17px]">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-7">
          <StatTile label="Faturamento líquido" value={money(s.netRevenue)} icon={CircleDollarSign} delta={d("netRevenue")} hint="O que fica pra você: valor pago menos taxas da Cakto e comissões." />
          <StatTile label="Gastos com anúncios" value={money(s.adSpend)} icon={Megaphone} delta={d("adSpend")} goodWhenUp={false} hint="Valor investido no Meta Ads no período." />
          <StatTile label="ROAS" value={ratio(s.roas)} icon={TrendingUp} delta={d("roas")} hint="Faturamento líquido ÷ gastos com anúncios." />
          <StatTile label="CPA" value={moneyOrDash(s.cpa)} icon={Target} delta={d("cpa")} goodWhenUp={false} hint="Custo por venda aprovada: gastos ÷ vendas." />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="ROI" value={percent(s.roi)} icon={Percent} delta={d("roi")} hint="Lucro ÷ (gastos com anúncios + custo dos produtos)." />
        <StatTile label="Vendas aprovadas" value={num(s.approved.count)} icon={ShoppingCart} delta={deltaOf(s.approved.count, p?.approved.count ?? null)} sub={<span>Ticket médio {moneyOrDash(s.avgTicket)}</span>} />
        <StatTile
          label="Vendas pendentes"
          value={money(s.pending.value)}
          icon={Clock}
          sub={<span>{num(s.pending.count)} Pix/boletos aguardando pagamento</span>}
        />
        <StatTile
          label="Reembolsos + chargebacks"
          value={money(s.refunded.value + s.chargeback.value)}
          icon={RotateCcw}
          tone={s.refundRate && s.refundRate > 0.08 ? "bad" : "default"}
          sub={
            <span>
              {num(s.refunded.count + s.chargeback.count)} vendas · taxa {percent(s.refundRate)}
            </span>
          }
        />
      </div>

      {/* ── Gráfico principal + pagamentos ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="pb-3 lg:col-span-2">
          <CardHeader
            title={series.hourly ? "Faturamento, gastos e lucro por hora" : "Faturamento, gastos e lucro por dia"}
            subtitle={series.hourly ? "Gasto do dia distribuído pelas horas (o Meta só informa o total diário)" : undefined}
          />
          <div className="pt-3">
            <RevenueChart data={series.points} hourly={series.hourly} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Vendas por pagamento" subtitle="Aprovadas e taxa de aprovação por método" />
          <div className="pt-4">
            <PaymentDonut rows={payments} />
          </div>
        </Card>
      </div>

      {/* ── Funil + fluxo do dinheiro ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Funil do Meta Ads" subtitle="Do anúncio até a venda aprovada" />
          <div className="pt-4">
            <Funnel s={s} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Para onde foi o dinheiro"
            subtitle="Do faturamento bruto até o lucro"
            right={
              <Link href="/configuracoes" className="text-xs font-medium text-primary hover:underline">
                Ajustar impostos e custos
              </Link>
            }
          />
          <div className="pt-2">
            <MoneyFlow s={s} taxRate={ds.settings.tax_rate} />
          </div>
        </Card>
      </div>

      {/* ── Rankings ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Vendas por produto" />
          <div className="pt-4">
            <RankList rows={products} empty="Nenhuma venda aprovada no período." />
          </div>
        </Card>
        <Card>
          <CardHeader title="Vendas por fonte" subtitle="Pelo utm_source" />
          <div className="pt-4">
            <RankList rows={sources} empty="Nenhuma venda aprovada no período." />
          </div>
        </Card>
        <Card>
          <CardHeader title="Vendas por horário" />
          <div className="pt-3">
            <HourBars data={hours} />
          </div>
        </Card>
      </div>

      {/* ── Top campanhas ── */}
      <Card className="mt-4 overflow-hidden">
        <CardHeader
          title="Campanhas com mais investimento"
          right={
            <Link href={`/campanhas`} className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-5 py-2 font-medium">Campanha</th>
                <th className="px-3 py-2 text-right font-medium">Gastos</th>
                <th className="px-3 py-2 text-right font-medium">Vendas</th>
                <th className="px-3 py-2 text-right font-medium">Faturamento</th>
                <th className="px-3 py-2 text-right font-medium">ROAS</th>
                <th className="px-5 py-2 text-right font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="max-w-[320px] px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <AdStatusBadge status={c.status} />
                      <span className="truncate font-medium text-text">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular text-text-2">{money(c.spend)}</td>
                  <td className="px-3 py-2.5 text-right tabular text-text-2">{num(c.sales)}</td>
                  <td className="px-3 py-2.5 text-right tabular text-text-2">{money(c.revenue)}</td>
                  <td className="px-3 py-2.5 text-right tabular text-text-2">{ratio(c.roas)}</td>
                  <td className={clsx("px-5 py-2.5 text-right font-medium tabular", c.profit >= 0 ? "text-good" : "text-bad")}>{money(c.profit)}</td>
                </tr>
              ))}
              {!topCampaigns.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">
                    Nenhum dado de campanha no período. Conecte sua conta do Meta em Integrações.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Faturamento bruto" value={money(s.grossRevenue)} delta={d("grossRevenue")} icon={CircleDollarSign} />
        <StatTile label="Impostos" value={money(s.taxes)} icon={BadgePercent} sub={<span>{num(ds.settings.tax_rate)}% sobre o líquido</span>} />
        <StatTile label="Vendas recusadas" value={num(s.refused.count)} sub={<span>{money(s.refused.value)} em cartões recusados</span>} />
        <StatTile
          label="Vendas rastreadas"
          value={percent(s.attributedRate)}
          hint="Parte das vendas aprovadas que chegou com UTM de uma campanha do Meta. Abaixo de 80%? Confira o script e as UTMs."
        />
      </div>
    </>
  );
}
