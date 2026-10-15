import { dayInBRT, eachDay, formatDayShort, hourInBRT, todayBRT } from "./dates";
import { safeDiv } from "./format";
import type { AdInsight, Dataset, EntityLevel, Filters, PaymentMethod, Sale } from "./types";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão",
  boleto: "Boleto",
  other: "Outros",
};

/** Aplica os filtros de conta / produto / fonte. Gastos não têm produto, então só a conta filtra os anúncios. */
export function applyFilters(ds: Dataset, f: Pick<Filters, "account" | "product" | "source">) {
  let insights = ds.insights;
  let sales = ds.sales;
  if (f.account) {
    insights = insights.filter((i) => i.account_id === f.account);
    const campaigns = new Set(ds.entities.filter((e) => e.account_id === f.account).map((e) => e.entity_id));
    insights.forEach((i) => campaigns.add(i.campaign_id));
    sales = sales.filter((s) => s.campaign_id && campaigns.has(s.campaign_id));
  }
  if (f.product) sales = sales.filter((s) => s.product_id === f.product);
  if (f.source) sales = sales.filter((s) => (s.utm_source ?? "").toLowerCase() === f.source!.toLowerCase());
  return { sales, insights };
}

const isApproved = (s: Sale) => s.status === "approved";

interface Money {
  count: number;
  value: number;
}
const sumBy = (list: Sale[], field: "gross_amount" | "net_amount" = "gross_amount"): Money => ({
  count: list.length,
  value: list.reduce((a, s) => a + s[field], 0),
});

export interface Summary {
  grossRevenue: number;
  netRevenue: number;
  adSpend: number;
  fees: number;
  taxes: number;
  productCosts: number;
  profit: number;
  roas: number | null;
  roi: number | null;
  margin: number | null;
  cpa: number | null;
  avgTicket: number | null;
  approved: Money;
  pending: Money;
  refused: Money;
  refunded: Money;
  chargeback: Money;
  refundRate: number | null;
  attributedRate: number | null;
  impressions: number;
  clicks: number;
  linkClicks: number;
  landingPageViews: number;
  initiateCheckouts: number;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  costPerIc: number | null;
}

export function summarize(sales: Sale[], insights: AdInsight[], ds: Pick<Dataset, "products" | "settings">): Summary {
  const costOf = new Map(ds.products.map((p) => [p.external_id, p.cost]));
  const approvedList = sales.filter(isApproved);
  const approved = sumBy(approvedList);
  const net = approvedList.reduce((a, s) => a + s.net_amount, 0);
  const fees = approvedList.reduce((a, s) => a + s.fees, 0);
  const productCosts = approvedList.reduce((a, s) => a + (costOf.get(s.product_id ?? "") ?? 0), 0);
  const taxes = (net * (ds.settings.tax_rate || 0)) / 100;

  const spend = insights.reduce((a, i) => a + i.spend, 0);
  const impressions = insights.reduce((a, i) => a + i.impressions, 0);
  const clicks = insights.reduce((a, i) => a + i.clicks, 0);
  const linkClicks = insights.reduce((a, i) => a + i.link_clicks, 0);
  const lpv = insights.reduce((a, i) => a + i.landing_page_views, 0);
  const ic = insights.reduce((a, i) => a + i.initiate_checkouts, 0);

  const profit = net - spend - taxes - productCosts;
  const refunded = sumBy(sales.filter((s) => s.status === "refunded"));
  const chargeback = sumBy(sales.filter((s) => s.status === "chargeback"));
  const paidEver = approved.count + refunded.count + chargeback.count;

  return {
    grossRevenue: approved.value,
    netRevenue: net,
    adSpend: spend,
    fees,
    taxes,
    productCosts,
    profit,
    roas: safeDiv(net, spend),
    roi: safeDiv(profit, spend + productCosts),
    margin: safeDiv(profit, net),
    cpa: safeDiv(spend, approved.count),
    avgTicket: safeDiv(approved.value, approved.count),
    approved,
    pending: sumBy(sales.filter((s) => s.status === "pending")),
    refused: sumBy(sales.filter((s) => s.status === "refused")),
    refunded,
    chargeback,
    refundRate: safeDiv(refunded.count + chargeback.count, paidEver),
    attributedRate: safeDiv(approvedList.filter((s) => s.campaign_id).length, approved.count),
    impressions,
    clicks,
    linkClicks,
    landingPageViews: lpv,
    initiateCheckouts: ic,
    cpm: impressions ? (spend / impressions) * 1000 : null,
    ctr: safeDiv(linkClicks, impressions),
    cpc: safeDiv(spend, linkClicks),
    costPerIc: safeDiv(spend, ic),
  };
}

export interface PaymentRow {
  method: PaymentMethod;
  label: string;
  count: number;
  value: number;
  approvalRate: number | null;
  total: number;
}

/** Vendas aprovadas por forma de pagamento + taxa de aprovação (aprovadas ÷ todas as tentativas). */
export function byPayment(sales: Sale[]): PaymentRow[] {
  const methods: PaymentMethod[] = ["pix", "card", "boleto", "other"];
  return methods
    .map((m) => {
      const all = sales.filter((s) => s.payment_method === m);
      const ok = all.filter((s) => s.status !== "pending" && s.status !== "refused");
      const approved = all.filter(isApproved);
      return {
        method: m,
        label: PAYMENT_LABEL[m],
        count: approved.length,
        value: approved.reduce((a, s) => a + s.gross_amount, 0),
        approvalRate: safeDiv(ok.length, all.length),
        total: all.length,
      };
    })
    .filter((r) => r.total > 0 || r.method !== "other");
}

export interface RankRow {
  key: string;
  label: string;
  count: number;
  value: number;
}

export function rankBy(sales: Sale[], keyOf: (s: Sale) => string | null, labelOf: (s: Sale) => string, limit = 6) {
  const map = new Map<string, RankRow>();
  for (const s of sales.filter(isApproved)) {
    const key = keyOf(s) ?? "__none";
    const row = map.get(key) ?? { key, label: key === "__none" ? "Sem rastreio" : labelOf(s), count: 0, value: 0 };
    row.count += 1;
    row.value += s.gross_amount;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export interface DailyPoint {
  key: string;
  label: string;
  revenue: number;
  spend: number;
  profit: number;
  sales: number;
}

/** Série temporal: por hora quando o período é de 1 dia, senão por dia. */
export function timeSeries(
  sales: Sale[],
  insights: AdInsight[],
  ds: Pick<Dataset, "products" | "settings">,
  from: string,
  to: string,
): { points: DailyPoint[]; hourly: boolean } {
  const costOf = new Map(ds.products.map((p) => [p.external_id, p.cost]));
  const tax = (ds.settings.tax_rate || 0) / 100;
  const hourly = from === to;
  const keys = hourly ? Array.from({ length: 24 }, (_, h) => String(h)) : eachDay(from, to);
  const map = new Map<string, DailyPoint>(
    keys.map((k) => [
      k,
      { key: k, label: hourly ? `${k.padStart(2, "0")}h` : formatDayShort(k), revenue: 0, spend: 0, profit: 0, sales: 0 },
    ]),
  );
  for (const s of sales.filter(isApproved)) {
    const p = map.get(hourly ? String(hourInBRT(s.occurred_at)) : dayInBRT(s.occurred_at));
    if (!p) continue;
    p.revenue += s.net_amount;
    p.sales += 1;
    p.profit += s.net_amount * (1 - tax) - (costOf.get(s.product_id ?? "") ?? 0);
  }
  if (hourly) {
    // O Meta só entrega gasto por dia: distribuímos proporcionalmente às horas já passadas.
    const spend = insights.reduce((a, i) => a + i.spend, 0);
    const hours = from === todayBRT() ? hourInBRT(new Date()) + 1 : 24;
    map.forEach((p) => {
      if (Number(p.key) >= hours) return;
      p.spend = spend / hours;
      p.profit -= p.spend;
    });
  } else {
    for (const i of insights) {
      const p = map.get(i.date);
      if (!p) continue;
      p.spend += i.spend;
      p.profit -= i.spend;
    }
  }
  return { points: [...map.values()], hourly };
}

/** Vendas aprovadas por hora do dia (0–23). */
export function salesByHour(sales: Sale[]) {
  const arr = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2, "0")}h`, count: 0, value: 0 }));
  for (const s of sales.filter(isApproved)) {
    const h = hourInBRT(s.occurred_at);
    arr[h].count += 1;
    arr[h].value += s.gross_amount;
  }
  return arr;
}

// ─────────────────────────────────────────────────────────────
// Tabela de campanhas / conjuntos / anúncios
// ─────────────────────────────────────────────────────────────

export interface AdRow {
  id: string;
  name: string;
  parentName: string | null;
  status: string | null;
  budget: number | null;
  spend: number;
  impressions: number;
  linkClicks: number;
  lpv: number;
  ic: number;
  sales: number;
  revenue: number;
  profit: number;
  roas: number | null;
  cpa: number | null;
  roi: number | null;
  margin: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  connectRate: number | null;
  checkoutRate: number | null;
}

export function adRows(sales: Sale[], insights: AdInsight[], ds: Dataset, level: EntityLevel): AdRow[] {
  const costOf = new Map(ds.products.map((p) => [p.external_id, p.cost]));
  const tax = (ds.settings.tax_rate || 0) / 100;
  const idOf = (x: { campaign_id: string | null; adset_id: string | null; ad_id: string | null }) =>
    level === "campaign" ? x.campaign_id : level === "adset" ? x.adset_id : x.ad_id;

  const entity = new Map(ds.entities.filter((e) => e.level === level).map((e) => [e.entity_id, e]));
  const campaignName = new Map(ds.entities.filter((e) => e.level === "campaign").map((e) => [e.entity_id, e.name]));
  const adsetName = new Map(ds.entities.filter((e) => e.level === "adset").map((e) => [e.entity_id, e.name]));

  const rows = new Map<string, AdRow>();
  const get = (id: string, fallbackName: string | null, parent: string | null) => {
    let r = rows.get(id);
    if (!r) {
      const e = entity.get(id);
      r = {
        id,
        name: e?.name ?? fallbackName ?? id,
        parentName: parent,
        status: e?.status ?? null,
        budget: e?.daily_budget ?? null,
        spend: 0,
        impressions: 0,
        linkClicks: 0,
        lpv: 0,
        ic: 0,
        sales: 0,
        revenue: 0,
        profit: 0,
        roas: null,
        cpa: null,
        roi: null,
        margin: null,
        ctr: null,
        cpc: null,
        cpm: null,
        connectRate: null,
        checkoutRate: null,
      };
      rows.set(id, r);
    }
    return r;
  };

  for (const i of insights) {
    const id = idOf(i)!;
    const name = level === "campaign" ? i.campaign_name : level === "adset" ? i.adset_name : i.ad_name;
    const parent =
      level === "campaign" ? null : level === "adset" ? (campaignName.get(i.campaign_id) ?? i.campaign_name) : (adsetName.get(i.adset_id) ?? i.adset_name);
    const r = get(id, name, parent);
    r.spend += i.spend;
    r.impressions += i.impressions;
    r.linkClicks += i.link_clicks;
    r.lpv += i.landing_page_views;
    r.ic += i.initiate_checkouts;
  }

  const productCost = new Map<string, number>();
  for (const s of sales.filter(isApproved)) {
    const id = idOf(s);
    if (!id) continue;
    const r = get(id, null, null);
    r.sales += 1;
    r.revenue += s.net_amount;
    productCost.set(id, (productCost.get(id) ?? 0) + (costOf.get(s.product_id ?? "") ?? 0));
  }

  for (const r of rows.values()) {
    const pc = productCost.get(r.id) ?? 0;
    r.profit = r.revenue * (1 - tax) - pc - r.spend;
    r.roas = safeDiv(r.revenue, r.spend);
    r.cpa = safeDiv(r.spend, r.sales);
    r.roi = safeDiv(r.profit, r.spend + pc);
    r.margin = safeDiv(r.profit, r.revenue);
    r.ctr = safeDiv(r.linkClicks, r.impressions);
    r.cpc = safeDiv(r.spend, r.linkClicks);
    r.cpm = r.impressions ? (r.spend / r.impressions) * 1000 : null;
    r.connectRate = safeDiv(r.lpv, r.linkClicks);
    r.checkoutRate = safeDiv(r.sales, r.ic);
  }

  return [...rows.values()].sort((a, b) => b.spend - a.spend || b.revenue - a.revenue);
}

export function deltaOf(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
