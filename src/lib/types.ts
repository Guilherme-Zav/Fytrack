export type SaleStatus = "approved" | "pending" | "refused" | "refunded" | "chargeback";
export type PaymentMethod = "pix" | "card" | "boleto" | "other";

export interface Sale {
  id: string;
  external_id: string;
  status: SaleStatus;
  payment_method: PaymentMethod;
  product_id: string | null;
  product_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  gross_amount: number;
  net_amount: number;
  fees: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  occurred_at: string;
}

export interface AdInsight {
  account_id: string;
  date: string;
  campaign_id: string;
  campaign_name: string | null;
  adset_id: string;
  adset_name: string | null;
  ad_id: string;
  ad_name: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  initiate_checkouts: number;
  meta_purchases: number;
}

export type EntityLevel = "campaign" | "adset" | "ad";

export interface MetaEntity {
  level: EntityLevel;
  entity_id: string;
  account_id: string;
  name: string;
  status: string | null;
  daily_budget: number | null;
  campaign_id: string | null;
  adset_id: string | null;
}

export interface Product {
  external_id: string;
  name: string;
  cost: number;
}

export interface AdAccount {
  account_id: string;
  name: string;
  currency: string | null;
  active: boolean;
  last_synced_at: string | null;
}

export interface UserSettings {
  webhook_token: string;
  cakto_secret: string | null;
  tax_rate: number;
  has_meta_token: boolean;
}

export type PeriodPreset =
  | "hoje"
  | "ontem"
  | "7d"
  | "14d"
  | "30d"
  | "mes"
  | "mes_passado"
  | "90d"
  | "custom";

export interface Filters {
  preset: PeriodPreset;
  from: string; // yyyy-mm-dd (horário de Brasília)
  to: string;
  account: string | null;
  product: string | null;
  source: string | null;
}

export interface Dataset {
  demo: boolean;
  sales: Sale[];
  insights: AdInsight[];
  entities: MetaEntity[];
  products: Product[];
  accounts: AdAccount[];
  settings: UserSettings;
}
