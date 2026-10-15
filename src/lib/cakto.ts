import type { PaymentMethod, SaleStatus } from "./types";

/**
 * Padrão de UTM recomendado no Meta (o mesmo da UTMify, então anúncios já
 * configurados continuam funcionando):
 *   utm_campaign={{campaign.name}}|{{campaign.id}}
 *   utm_medium={{adset.name}}|{{adset.id}}
 *   utm_content={{ad.name}}|{{ad.id}}
 * Extrai o id numérico depois do último "|".
 */
export function extractMetaId(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = decodeURIComponent(String(v)).trim();
  const m = s.match(/\|\s*(\d{6,})\s*$/);
  if (m) return m[1];
  if (/^\d{6,}$/.test(s)) return s;
  return null;
}

const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck"] as const;
type TrackingKey = (typeof TRACKING_KEYS)[number];
export type Tracking = Record<TrackingKey, string | null>;

/** Procura as UTMs em qualquer lugar do payload (a Cakto pode mandar em data, data.tracking, na URL do checkout…). */
export function findTracking(payload: unknown): Tracking {
  const found: Partial<Record<TrackingKey, string>> = {};
  const urls: string[] = [];

  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 6) return;
    for (const [rawKey, value] of Object.entries(node as Record<string, unknown>)) {
      const key = rawKey.toLowerCase().replace(/^utm(?=[a-z])/, "utm_") as TrackingKey;
      if (TRACKING_KEYS.includes(key) && typeof value === "string" && value && !found[key]) {
        found[key] = value;
      } else if (typeof value === "string" && /^https?:\/\/.+\?/.test(value)) {
        urls.push(value);
      } else if (typeof value === "object") {
        walk(value, depth + 1);
      }
    }
  };
  walk(payload, 0);

  for (const u of urls) {
    try {
      const params = new URL(u).searchParams;
      for (const k of TRACKING_KEYS) {
        const v = params.get(k);
        if (v && !found[k]) found[k] = v;
      }
    } catch {
      /* URL inválida — ignora */
    }
  }

  return Object.fromEntries(TRACKING_KEYS.map((k) => [k, found[k] ?? null])) as Tracking;
}

/** Evento da Cakto → status interno. null = evento que não muda venda (só fica no log). */
export function statusFromEvent(event: string, dataStatus?: string): SaleStatus | null {
  switch (event) {
    case "purchase_approved":
    case "subscription_renewed":
    case "subscription_late_recovered":
      return "approved";
    case "pix_gerado":
    case "boleto_gerado":
    case "picpay_gerado":
    case "openfinance_nubank_gerado":
      return "pending";
    case "purchase_refused":
    case "subscription_renewal_refused":
      return "refused";
    case "refund":
      return "refunded";
    case "chargeback":
      return "chargeback";
    case "initiate_checkout":
    case "checkout_abandonment":
    case "refund_requested":
    case "subscription_created":
    case "subscription_canceled":
    case "subscription_paused":
    case "subscription_resumed":
    case "subscription_late":
      return null;
  }
  // Evento desconhecido: cai no status que vier no payload.
  switch (dataStatus) {
    case "paid":
    case "authorized":
      return "approved";
    case "waiting_payment":
    case "processing":
      return "pending";
    case "refused":
      return "refused";
    case "refunded":
      return "refunded";
    case "chargedback":
    case "chargeback":
      return "chargeback";
  }
  return null;
}

/** Evita que um webhook atrasado ("pix gerado") rebaixe uma venda já aprovada. */
const RANK: Record<SaleStatus, number> = { pending: 0, refused: 1, approved: 2, refunded: 3, chargeback: 3 };
export function mergeStatus(current: SaleStatus | undefined, incoming: SaleStatus): SaleStatus {
  if (!current) return incoming;
  return RANK[incoming] >= RANK[current] ? incoming : current;
}

export function normalizePayment(v: unknown): PaymentMethod {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("pix")) return "pix";
  if (s.includes("boleto")) return "boleto";
  if (s.includes("card") || s.includes("cartao") || s.includes("credit") || s.includes("pay")) return "card";
  return "other";
}

const toNum = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

interface CaktoCommission {
  type?: string;
  totalAmount?: number | string;
}

export interface ParsedSale {
  external_id: string;
  ref_id: string | null;
  status: SaleStatus;
  payment_method: PaymentMethod;
  product_id: string | null;
  product_name: string | null;
  offer_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  gross_amount: number;
  net_amount: number;
  fees: number;
  installments: number | null;
  occurred_at: string;
  paid_at: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  tracking: Tracking;
}

/** Converte o payload da Cakto. Retorna null se o evento não representa uma venda. */
export function parseCaktoPayload(body: Record<string, unknown>): ParsedSale | null {
  const event = String(body.event ?? "");
  const data = (body.data ?? {}) as Record<string, unknown>;
  const status = statusFromEvent(event, str(data.status) ?? undefined);
  const externalId = str(data.id) ?? str(data.refId);
  if (!status || !externalId) return null;

  const product = (data.product ?? {}) as Record<string, unknown>;
  const offer = (data.offer ?? {}) as Record<string, unknown>;
  const customer = (data.customer ?? {}) as Record<string, unknown>;

  const gross = toNum(data.amount ?? data.baseAmount ?? offer.price);
  const fees = toNum(data.fees);
  const commissions = Array.isArray(data.commissions) ? (data.commissions as CaktoCommission[]) : [];
  const producer = commissions.find((c) => c.type === "producer");
  const net = producer ? toNum(producer.totalAmount) : Math.max(gross - fees, 0);

  const tracking = findTracking(body);
  const paidAt = str(data.paidAt);
  const createdAt = str(data.createdAt) ?? new Date().toISOString();

  return {
    external_id: externalId,
    ref_id: str(data.refId),
    status,
    payment_method: normalizePayment(data.paymentMethod),
    product_id: str(product.id) ?? str(product.short_id),
    product_name: str(product.name) ?? str(offer.name),
    offer_name: str(offer.name),
    customer_name: str(customer.name),
    customer_email: str(customer.email),
    customer_phone: str(customer.phone),
    gross_amount: gross,
    net_amount: net,
    fees,
    installments: data.installments != null ? toNum(data.installments) : null,
    occurred_at: paidAt ?? createdAt,
    paid_at: paidAt,
    campaign_id: extractMetaId(tracking.utm_campaign),
    adset_id: extractMetaId(tracking.utm_medium),
    ad_id: extractMetaId(tracking.utm_content),
    tracking,
  };
}
