import "server-only";
import type { AdInsight, MetaEntity } from "./types";

const VERSION = process.env.META_API_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

export class MetaError extends Error {}

async function graph<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  if (!path.startsWith("http")) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("access_token", token);
  }
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) {
    const msg = json?.error?.error_user_msg || json?.error?.message || `Erro ${res.status} no Meta`;
    throw new MetaError(msg);
  }
  return json as T;
}

/** Percorre todas as páginas de um endpoint de lista do Graph. */
async function graphAll<T>(path: string, token: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  let page = await graph<{ data: T[]; paging?: { next?: string } }>(path, token, params);
  out.push(...page.data);
  let guard = 0;
  while (page.paging?.next && guard++ < 50) {
    page = await graph(page.paging.next, token);
    out.push(...page.data);
  }
  return out;
}

export interface RemoteAdAccount {
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
}

export function listAdAccounts(token: string) {
  return graphAll<RemoteAdAccount>("/me/adaccounts", token, {
    fields: "account_id,name,currency,timezone_name,account_status",
    limit: "200",
  });
}

interface Action {
  action_type: string;
  value: string;
}

/** Pega a primeira ação encontrada na ordem de preferência (evita contar o mesmo evento duas vezes). */
function pickAction(actions: Action[] | undefined, types: string[]): number {
  if (!actions) return 0;
  for (const t of types) {
    const a = actions.find((x) => x.action_type === t);
    if (a) return Number(a.value) || 0;
  }
  return 0;
}

const LPV = ["landing_page_view", "omni_landing_page_view"];
const IC = ["omni_initiated_checkout", "initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"];
const PURCHASE = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];

interface RawInsight {
  date_start: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  inline_link_clicks?: string;
  actions?: Action[];
}

export async function fetchInsights(token: string, accountId: string, since: string, until: string): Promise<AdInsight[]> {
  const rows = await graphAll<RawInsight>(`/act_${accountId}/insights`, token, {
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    fields:
      "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,inline_link_clicks,actions",
    limit: "500",
  });
  return rows.map((r) => ({
    account_id: accountId,
    date: r.date_start,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    adset_id: r.adset_id,
    adset_name: r.adset_name,
    ad_id: r.ad_id,
    ad_name: r.ad_name,
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    link_clicks: Number(r.inline_link_clicks ?? 0),
    landing_page_views: pickAction(r.actions, LPV),
    initiate_checkouts: pickAction(r.actions, IC),
    meta_purchases: pickAction(r.actions, PURCHASE),
  }));
}

interface RawEntity {
  id: string;
  name: string;
  effective_status?: string;
  daily_budget?: string;
  campaign_id?: string;
  adset_id?: string;
}

/** Status e orçamento diário (o Meta devolve o orçamento em centavos). */
export async function fetchEntities(token: string, accountId: string): Promise<MetaEntity[]> {
  const base = { limit: "500" };
  const [campaigns, adsets, ads] = await Promise.all([
    graphAll<RawEntity>(`/act_${accountId}/campaigns`, token, { ...base, fields: "id,name,effective_status,daily_budget" }),
    graphAll<RawEntity>(`/act_${accountId}/adsets`, token, {
      ...base,
      fields: "id,name,effective_status,daily_budget,campaign_id",
    }),
    graphAll<RawEntity>(`/act_${accountId}/ads`, token, {
      ...base,
      fields: "id,name,effective_status,campaign_id,adset_id",
    }),
  ]);
  const map = (level: MetaEntity["level"]) => (e: RawEntity): MetaEntity => ({
    level,
    entity_id: e.id,
    account_id: accountId,
    name: e.name,
    status: e.effective_status ?? null,
    daily_budget: e.daily_budget ? Number(e.daily_budget) / 100 : null,
    campaign_id: e.campaign_id ?? (level === "campaign" ? e.id : null),
    adset_id: e.adset_id ?? (level === "adset" ? e.id : null),
  });
  return [...campaigns.map(map("campaign")), ...adsets.map(map("adset")), ...ads.map(map("ad"))];
}
