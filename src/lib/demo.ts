import { addDays, eachDay, todayBRT } from "./dates";
import type { AdInsight, Dataset, MetaEntity, PaymentMethod, Product, Sale, SaleStatus } from "./types";

/** Dados fictícios, determinísticos, para ver o painel funcionando antes de conectar o Supabase. */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ACCOUNT = "120000000000001";

const PRODUCTS: (Product & { price: number })[] = [
  { external_id: "prod_metodo", name: "Método Acelerado", cost: 0, price: 197 },
  { external_id: "prod_mentoria", name: "Mentoria Express", cost: 0, price: 497 },
  { external_id: "prod_ebook", name: "E-book Receitas Fit", cost: 0, price: 47 },
];

const CAMPAIGNS = [
  { id: "238500000000101", name: "[VENDAS] Método Acelerado | ABO", product: 0, daily: 450, status: "ACTIVE" },
  { id: "238500000000102", name: "[VENDAS] Mentoria Express | CBO", product: 1, daily: 300, status: "ACTIVE" },
  { id: "238500000000103", name: "[REMARKETING] Todos os produtos", product: 2, daily: 90, status: "ACTIVE" },
  { id: "238500000000104", name: "[TESTE] Criativos Out", product: 0, daily: 120, status: "PAUSED" },
];

const ADSETS = ["Aberto 25-45", "Interesses Fitness", "LAL 1% Compradores"];
const ADS = ["Vídeo depoimento", "Carrossel antes/depois", "Estático oferta"];
const SOURCES = ["FB", "FB", "FB", "FB", "FB", "ig", "google", "youtube", "organico"];
const FIRST = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabi", "Hugo", "Isa", "João", "Larissa", "Marcos"];
const LAST = ["Souza", "Lima", "Alves", "Pereira", "Costa", "Rocha", "Martins", "Ribeiro"];

let cache: { day: string; data: Dataset } | null = null;

export function demoDataset(): Dataset {
  const today = todayBRT();
  if (cache?.day === today) return cache.data;

  const rand = rng(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const entities: MetaEntity[] = [];
  const insights: AdInsight[] = [];
  const sales: Sale[] = [];

  const structure = CAMPAIGNS.map((c, ci) => {
    entities.push({
      level: "campaign",
      entity_id: c.id,
      account_id: ACCOUNT,
      name: c.name,
      status: c.status,
      daily_budget: c.daily,
      campaign_id: c.id,
      adset_id: null,
    });
    const adsets = ADSETS.slice(0, ci === 2 ? 1 : 3).map((an, ai) => {
      const adsetId = `${c.id}${ai + 1}0`;
      entities.push({
        level: "adset",
        entity_id: adsetId,
        account_id: ACCOUNT,
        name: an,
        status: c.status === "PAUSED" ? "CAMPAIGN_PAUSED" : ai === 2 && ci === 1 ? "PAUSED" : "ACTIVE",
        daily_budget: null,
        campaign_id: c.id,
        adset_id: adsetId,
      });
      const ads = ADS.map((adn, di) => {
        const adId = `${adsetId}${di + 1}`;
        entities.push({
          level: "ad",
          entity_id: adId,
          account_id: ACCOUNT,
          name: adn,
          status: c.status === "PAUSED" ? "CAMPAIGN_PAUSED" : "ACTIVE",
          daily_budget: null,
          campaign_id: c.id,
          adset_id: adsetId,
        });
        // cada anúncio tem uma "qualidade" que define conversão
        return { id: adId, name: adn, quality: 0.5 + rand() * 1.1 };
      });
      return { id: adsetId, name: an, ads };
    });
    return { ...c, adsets };
  });

  const days = eachDay(addDays(today, -89), today);
  const nowHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date())) % 24;
  let saleSeq = 1;

  for (const day of days) {
    const isToday = day === today;
    const dayFactor = (isToday ? Math.max(nowHour, 1) / 24 : 1) * (0.75 + rand() * 0.5);
    for (const c of structure) {
      if (c.status === "PAUSED" && day > addDays(today, -40)) continue;
      const nAds = c.adsets.reduce((n, a) => n + a.ads.length, 0);
      for (const as of c.adsets) {
        for (const ad of as.ads) {
          const spend = Math.round(((c.daily / nAds) * dayFactor * (0.7 + rand() * 0.6)) * 100) / 100;
          const cpm = 18 + rand() * 22;
          const impressions = Math.round((spend / cpm) * 1000);
          const clicks = Math.round(impressions * (0.012 + rand() * 0.018) * ad.quality);
          const linkClicks = Math.round(clicks * 0.78);
          const lpv = Math.round(linkClicks * (0.62 + rand() * 0.2));
          const ic = Math.round(lpv * (0.08 + rand() * 0.07) * ad.quality);
          insights.push({
            account_id: ACCOUNT,
            date: day,
            campaign_id: c.id,
            campaign_name: c.name,
            adset_id: as.id,
            adset_name: as.name,
            ad_id: ad.id,
            ad_name: ad.name,
            spend,
            impressions,
            clicks,
            link_clicks: linkClicks,
            landing_page_views: lpv,
            initiate_checkouts: ic,
            meta_purchases: 0,
          });

          const product = PRODUCTS[c.product === 2 ? Math.floor(rand() * 3) : c.product];
          const expected = ic * (0.1 + rand() * 0.12);
          const nSales = Math.floor(expected) + (rand() < expected % 1 ? 1 : 0);
          for (let i = 0; i < nSales; i++) {
            sales.push(makeSale(day, product, { c, as, ad }, isToday ? nowHour : 23));
          }
        }
      }
    }
    // vendas sem rastreio (orgânico / outras fontes)
    const organic = Math.floor(rand() * 3);
    for (let i = 0; i < organic; i++) sales.push(makeSale(day, pick(PRODUCTS), null, isToday ? nowHour : 23));
  }

  function makeSale(
    day: string,
    product: (typeof PRODUCTS)[number],
    attribution: { c: { id: string; name: string }; as: { id: string; name: string }; ad: { id: string; name: string } } | null,
    maxHour: number,
  ): Sale {
    const r = rand();
    const method: PaymentMethod = r < 0.58 ? "pix" : r < 0.93 ? "card" : "boleto";
    const s = rand();
    let status: SaleStatus = "approved";
    if (method === "pix") status = s < 0.72 ? "approved" : "pending";
    else if (method === "boleto") status = s < 0.38 ? "approved" : "pending";
    else status = s < 0.8 ? "approved" : "refused";
    if (status === "approved") {
      const t = rand();
      if (t < 0.045) status = "refunded";
      else if (t < 0.052) status = "chargeback";
    }
    // pendentes antigas: pix/boleto expirados viram "recusada"
    // horário com pico à noite
    const hourWeights = [1, 0.5, 0.3, 0.2, 0.2, 0.3, 0.6, 1, 1.4, 1.7, 1.9, 2, 2.1, 2, 1.9, 1.9, 2, 2.2, 2.6, 3, 3.2, 3, 2.4, 1.6];
    const total = hourWeights.slice(0, maxHour + 1).reduce((a, b) => a + b, 0);
    let x = rand() * total;
    let hour = 0;
    while (hour < maxHour && x > hourWeights[hour]) x -= hourWeights[hour++];
    const minute = Math.floor(rand() * 60);
    const occurred = `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`;
    const gross = product.price;
    const fees = Math.round((gross * 0.0399 + 2.49) * 100) / 100;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const source = attribution ? "FB" : pick(SOURCES.slice(5));
    const id = `demo_${String(saleSeq++).padStart(6, "0")}`;
    return {
      id,
      external_id: id,
      status,
      payment_method: method,
      product_id: product.external_id,
      product_name: product.name,
      customer_name: name,
      customer_email: `${name.split(" ")[0].toLowerCase()}${Math.floor(rand() * 900 + 100)}@email.com`,
      gross_amount: gross,
      net_amount: Math.round((gross - fees) * 100) / 100,
      fees,
      utm_source: source,
      utm_medium: attribution ? `${attribution.as.name}|${attribution.as.id}` : null,
      utm_campaign: attribution ? `${attribution.c.name}|${attribution.c.id}` : null,
      utm_content: attribution ? `${attribution.ad.name}|${attribution.ad.id}` : null,
      utm_term: attribution ? pick(["Instagram_Feed", "Instagram_Reels", "Facebook_Mobile_Feed", "Instagram_Stories"]) : null,
      campaign_id: attribution?.c.id ?? null,
      adset_id: attribution?.as.id ?? null,
      ad_id: attribution?.ad.id ?? null,
      occurred_at: new Date(occurred).toISOString(),
    };
  }

  const data: Dataset = {
    demo: true,
    sales,
    insights,
    entities,
    products: PRODUCTS.map(({ external_id, name }, i) => ({ external_id, name, cost: [12, 40, 0][i] })),
    accounts: [{ account_id: ACCOUNT, name: "FY Digital — Conta Principal", currency: "BRL", active: true, last_synced_at: new Date().toISOString() }],
    settings: { webhook_token: "demo", cakto_secret: null, tax_rate: 6, has_meta_token: true },
  };
  cache = { day: today, data };
  return data;
}
