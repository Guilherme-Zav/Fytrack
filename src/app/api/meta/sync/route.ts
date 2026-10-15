import { NextResponse, type NextRequest } from "next/server";
import { addDays, todayBRT } from "@/lib/dates";
import { fetchEntities, fetchInsights, MetaError } from "@/lib/meta";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Puxa insights diários (nível anúncio) + status/orçamentos das contas ativas.
 * Por padrão sincroniza os últimos 3 dias (o Meta ainda ajusta números recentes).
 * Body opcional: { "days": 30 } para reprocessar um histórico maior (máx. 90).
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const days = Math.min(Math.max(Number(body?.days) || 3, 1), 90);
  const until = todayBRT();
  const since = addDays(until, -(days - 1));

  const [{ data: settings }, { data: accounts }] = await Promise.all([
    supabase.from("settings").select("meta_access_token").eq("user_id", user.id).maybeSingle(),
    supabase.from("meta_ad_accounts").select("account_id,last_synced_at").eq("active", true),
  ]);
  const token = settings?.meta_access_token as string | undefined;
  if (!token) return NextResponse.json({ error: "Conecte o token do Meta em Integrações" }, { status: 400 });
  if (!accounts?.length) return NextResponse.json({ error: "Nenhuma conta de anúncio ativa" }, { status: 400 });

  const results: { account: string; rows: number; error?: string }[] = [];

  for (const acc of accounts) {
    try {
      // Primeira sincronização da conta: puxa 30 dias de histórico.
      const accSince = acc.last_synced_at ? since : addDays(until, -29);
      const [insights, entities] = await Promise.all([fetchInsights(token, acc.account_id, accSince, until), fetchEntities(token, acc.account_id)]);
      const now = new Date().toISOString();

      for (let i = 0; i < insights.length; i += 500) {
        const chunk = insights.slice(i, i + 500).map((r) => ({ ...r, user_id: user.id, updated_at: now }));
        const { error } = await supabase.from("ad_insights").upsert(chunk, { onConflict: "user_id,ad_id,date" });
        if (error) throw new Error(error.message);
      }
      for (let i = 0; i < entities.length; i += 500) {
        const chunk = entities.slice(i, i + 500).map((e) => ({ ...e, user_id: user.id, updated_at: now }));
        const { error } = await supabase.from("meta_entities").upsert(chunk, { onConflict: "user_id,level,entity_id" });
        if (error) throw new Error(error.message);
      }
      await supabase.from("meta_ad_accounts").update({ last_synced_at: now }).eq("account_id", acc.account_id);
      results.push({ account: acc.account_id, rows: insights.length });
    } catch (e) {
      results.push({ account: acc.account_id, rows: 0, error: e instanceof MetaError || e instanceof Error ? e.message : "erro" });
    }
  }

  const failed = results.filter((r) => r.error);
  if (failed.length === results.length) return NextResponse.json({ error: failed[0].error, results }, { status: 502 });
  return NextResponse.json({ ok: true, since, until, results });
}
