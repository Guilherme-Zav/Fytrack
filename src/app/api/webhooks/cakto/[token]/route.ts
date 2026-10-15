import { NextResponse, type NextRequest } from "next/server";
import { mergeStatus, parseCaktoPayload } from "@/lib/cakto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { SaleStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Recebe os webhooks da Cakto.
 * A Cakto considera entregue qualquer resposta em até 10 s, então sempre
 * respondemos rápido e registramos erros em webhook_logs.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });
  const { token } = await params;
  const db = supabaseAdmin();

  const { data: settings } = await db.from("settings").select("user_id,cakto_secret").eq("webhook_token", token).maybeSingle();
  if (!settings) return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  const userId = settings.user_id as string;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    await db.from("webhook_logs").insert({ user_id: userId, platform: "cakto", error: "JSON inválido" });
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : null;
  const log = (error: string | null) => db.from("webhook_logs").insert({ user_id: userId, platform: "cakto", event, payload: body, error });

  if (settings.cakto_secret && body.secret !== settings.cakto_secret) {
    await log("Secret não confere");
    return NextResponse.json({ error: "Secret inválido" }, { status: 401 });
  }

  const sale = parseCaktoPayload(body);
  if (!sale) {
    await log(null);
    return NextResponse.json({ ok: true, ignored: event });
  }

  // Não deixa um evento atrasado (ex.: "pix gerado") rebaixar uma venda já aprovada.
  const { data: existing } = await db
    .from("sales")
    .select("status,campaign_id,adset_id,ad_id,utm_source,utm_medium,utm_campaign,utm_content,utm_term")
    .eq("user_id", userId)
    .eq("platform", "cakto")
    .eq("external_id", sale.external_id)
    .maybeSingle();

  if (existing && mergeStatus(existing.status as SaleStatus, sale.status) !== sale.status) {
    await log(null);
    return NextResponse.json({ ok: true, kept: existing.status });
  }

  const t = sale.tracking;
  const row = {
    user_id: userId,
    platform: "cakto",
    external_id: sale.external_id,
    ref_id: sale.ref_id,
    status: mergeStatus(existing?.status as SaleStatus | undefined, sale.status),
    payment_method: sale.payment_method,
    product_id: sale.product_id,
    product_name: sale.product_name,
    offer_name: sale.offer_name,
    customer_name: sale.customer_name,
    customer_email: sale.customer_email,
    customer_phone: sale.customer_phone,
    gross_amount: sale.gross_amount,
    net_amount: sale.net_amount,
    fees: sale.fees,
    installments: sale.installments,
    // eventos posteriores (reembolso) às vezes chegam sem UTM: mantém a atribuição original
    utm_source: t.utm_source ?? existing?.utm_source ?? null,
    utm_medium: t.utm_medium ?? existing?.utm_medium ?? null,
    utm_campaign: t.utm_campaign ?? existing?.utm_campaign ?? null,
    utm_content: t.utm_content ?? existing?.utm_content ?? null,
    utm_term: t.utm_term ?? existing?.utm_term ?? null,
    src: t.src,
    sck: t.sck,
    campaign_id: sale.campaign_id ?? existing?.campaign_id ?? null,
    adset_id: sale.adset_id ?? existing?.adset_id ?? null,
    ad_id: sale.ad_id ?? existing?.ad_id ?? null,
    occurred_at: sale.occurred_at,
    paid_at: sale.paid_at,
    raw: body,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("sales").upsert(row, { onConflict: "user_id,platform,external_id" });
  if (error) {
    await log(`Erro ao salvar: ${error.message}`);
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  }

  if (sale.product_id) {
    await db
      .from("products")
      .upsert(
        { user_id: userId, external_id: sale.product_id, name: sale.product_name ?? sale.product_id },
        { onConflict: "user_id,external_id", ignoreDuplicates: true },
      );
  }

  await log(null);
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: true, message: "Webhook FYTRACKER ativo. Configure este endereço na Cakto (POST)." });
}
