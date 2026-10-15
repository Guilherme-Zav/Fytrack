import "server-only";
import { cache } from "react";
import { dayInBRT, endISO, startISO } from "./dates";
import { demoDataset } from "./demo";
import { isSupabaseConfigured } from "./supabase/config";
import { requireUser } from "./supabase/server";
import type { AdAccount, AdInsight, Dataset, MetaEntity, Product, Sale, UserSettings } from "./types";

type Supa = Awaited<ReturnType<typeof requireUser>>["supabase"];

const SALE_COLS =
  "id,external_id,status,payment_method,product_id,product_name,customer_name,customer_email,gross_amount,net_amount,fees,utm_source,utm_medium,utm_campaign,utm_content,utm_term,campaign_id,adset_id,ad_id,occurred_at";
const INSIGHT_COLS =
  "account_id,date,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,link_clicks,landing_page_views,initiate_checkouts,meta_purchases";

/** O PostgREST limita 1000 linhas por resposta — busca em páginas. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  const size = 1000;
  for (let page = 0; page < 100; page++) {
    const { data, error } = await build(page * size, page * size + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

const n = (v: unknown) => Number(v ?? 0);

async function loadSettings(supabase: Supa, userId: string): Promise<UserSettings> {
  let { data } = await supabase
    .from("settings")
    .select("webhook_token,cakto_secret,tax_rate,meta_access_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    // Usuário criado antes do trigger existir
    const res = await supabase
      .from("settings")
      .insert({ user_id: userId })
      .select("webhook_token,cakto_secret,tax_rate,meta_access_token")
      .single();
    data = res.data;
  }
  return {
    webhook_token: data?.webhook_token ?? "",
    cakto_secret: data?.cakto_secret ?? null,
    tax_rate: n(data?.tax_rate),
    has_meta_token: Boolean(data?.meta_access_token),
  };
}

/** Tudo que as telas precisam para um intervalo de datas (filtros finos são aplicados em metrics.ts). */
export const loadDataset = cache(async (from: string, to: string): Promise<Dataset> => {
  if (!isSupabaseConfigured) {
    const d = demoDataset();
    return {
      ...d,
      sales: d.sales.filter((s) => {
        const day = dayInBRT(s.occurred_at);
        return day >= from && day <= to;
      }),
      insights: d.insights.filter((i) => i.date >= from && i.date <= to),
    };
  }

  const { supabase, user } = await requireUser();
  if (!user) throw new Error("Não autenticado");

  const [sales, insights, entities, products, accounts, settings] = await Promise.all([
    fetchAll<Sale>((a, b) =>
      supabase
        .from("sales")
        .select(SALE_COLS)
        .gte("occurred_at", startISO(from))
        .lte("occurred_at", endISO(to))
        .order("occurred_at", { ascending: false })
        .range(a, b),
    ),
    fetchAll<AdInsight>((a, b) =>
      supabase.from("ad_insights").select(INSIGHT_COLS).gte("date", from).lte("date", to).order("date").range(a, b),
    ),
    fetchAll<MetaEntity>((a, b) =>
      supabase
        .from("meta_entities")
        .select("level,entity_id,account_id,name,status,daily_budget,campaign_id,adset_id")
        .range(a, b),
    ),
    supabase.from("products").select("external_id,name,cost").order("name"),
    supabase.from("meta_ad_accounts").select("account_id,name,currency,active,last_synced_at").order("name"),
    loadSettings(supabase, user.id),
  ]);

  return {
    demo: false,
    sales: sales.map((s) => ({ ...s, gross_amount: n(s.gross_amount), net_amount: n(s.net_amount), fees: n(s.fees) })),
    insights: insights.map((i) => ({
      ...i,
      spend: n(i.spend),
      impressions: n(i.impressions),
      clicks: n(i.clicks),
      link_clicks: n(i.link_clicks),
      landing_page_views: n(i.landing_page_views),
      initiate_checkouts: n(i.initiate_checkouts),
      meta_purchases: n(i.meta_purchases),
    })),
    entities: entities.map((e) => ({ ...e, daily_budget: e.daily_budget == null ? null : n(e.daily_budget) })),
    products: ((products.data ?? []) as Product[]).map((p) => ({ ...p, cost: n(p.cost) })),
    accounts: (accounts.data ?? []) as AdAccount[],
    settings,
  };
});

/** Dados leves para o layout (filtros da barra superior). */
export const loadShell = cache(async () => {
  if (!isSupabaseConfigured) {
    const d = demoDataset();
    return {
      demo: true,
      email: "demo@fytracker.app",
      accounts: d.accounts,
      products: d.products,
      sources: [...new Set(d.sales.map((s) => s.utm_source).filter(Boolean) as string[])].sort(),
    };
  }
  const { supabase, user } = await requireUser();
  const [accounts, products, sources] = await Promise.all([
    supabase.from("meta_ad_accounts").select("account_id,name,currency,active,last_synced_at").eq("active", true),
    supabase.from("products").select("external_id,name,cost").order("name"),
    supabase.from("sales").select("utm_source").not("utm_source", "is", null).order("occurred_at", { ascending: false }).limit(1000),
  ]);
  return {
    demo: false,
    email: user?.email ?? "",
    accounts: (accounts.data ?? []) as AdAccount[],
    products: (products.data ?? []) as Product[],
    sources: [...new Set((sources.data ?? []).map((s) => s.utm_source as string))].sort(),
  };
});
