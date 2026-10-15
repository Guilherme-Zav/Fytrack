"use server";

import { revalidatePath } from "next/cache";
import { listAdAccounts, MetaError } from "@/lib/meta";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const DEMO: ActionResult = { ok: false, error: "Modo demonstração: configure o Supabase para salvar." };

async function ctx() {
  if (!isSupabaseConfigured) return null;
  const { supabase, user } = await requireUser();
  if (!user) return null;
  return { supabase, user };
}

/** Valida o token no Meta, salva e importa as contas de anúncio. */
export async function saveMetaToken(token: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DEMO;
  token = token.trim();
  if (!token) return { ok: false, error: "Cole o token de acesso." };

  let accounts;
  try {
    accounts = await listAdAccounts(token);
  } catch (e) {
    return { ok: false, error: e instanceof MetaError ? `Meta recusou o token: ${e.message}` : "Não foi possível falar com o Meta." };
  }

  const { error } = await c.supabase.from("settings").update({ meta_access_token: token, updated_at: new Date().toISOString() }).eq("user_id", c.user.id);
  if (error) return { ok: false, error: error.message };

  const { data: existing } = await c.supabase.from("meta_ad_accounts").select("account_id");
  const known = new Set((existing ?? []).map((a) => a.account_id));
  const rows = accounts.map((a) => ({
    user_id: c.user.id,
    account_id: a.account_id,
    name: a.name,
    currency: a.currency,
    timezone: a.timezone_name,
    // contas novas: ativa automaticamente se for a única
    ...(known.has(a.account_id) ? {} : { active: accounts.length === 1 }),
  }));
  if (rows.length) {
    const { error: e2 } = await c.supabase.from("meta_ad_accounts").upsert(rows, { onConflict: "user_id,account_id" });
    if (e2) return { ok: false, error: e2.message };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `Token válido — ${accounts.length} conta(s) de anúncio encontrada(s).` };
}

export async function setAccountActive(accountId: string, active: boolean): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DEMO;
  const { error } = await c.supabase.from("meta_ad_accounts").update({ active }).eq("account_id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveTaxRate(rate: number): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DEMO;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return { ok: false, error: "Informe um percentual entre 0 e 100." };
  const { error } = await c.supabase.from("settings").update({ tax_rate: rate, updated_at: new Date().toISOString() }).eq("user_id", c.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Imposto salvo." };
}

export async function saveCaktoSecret(secret: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DEMO;
  const { error } = await c.supabase
    .from("settings")
    .update({ cakto_secret: secret.trim() || null, updated_at: new Date().toISOString() })
    .eq("user_id", c.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/integracoes");
  return { ok: true, message: secret.trim() ? "Secret salvo: webhooks sem esse secret serão recusados." : "Validação de secret desativada." };
}

export async function saveProductCost(externalId: string, cost: number): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DEMO;
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, error: "Custo inválido." };
  const { error } = await c.supabase.from("products").update({ cost }).eq("external_id", externalId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addProduct(externalId: string, name: string, cost: number): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return DEMO;
  if (!externalId.trim() || !name.trim()) return { ok: false, error: "Informe o id e o nome do produto." };
  const { error } = await c.supabase
    .from("products")
    .upsert({ user_id: c.user.id, external_id: externalId.trim(), name: name.trim(), cost: cost || 0 }, { onConflict: "user_id,external_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Produto salvo." };
}
