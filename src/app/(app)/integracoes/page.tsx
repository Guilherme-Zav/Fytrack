import { AlertTriangle, CheckCircle2, ExternalLink, Megaphone, Webhook } from "lucide-react";
import { AccountToggle, CopyField, MetaTokenForm, SecretForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { loadDataset } from "@/lib/data";
import { todayBRT } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import { appOrigin } from "@/lib/origin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-text-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{n}</span>
      <div className="pt-0.5">{children}</div>
    </li>
  );
}

async function recentWebhooks() {
  if (!isSupabaseConfigured) return [];
  const { supabase } = await requireUser();
  const { data } = await supabase.from("webhook_logs").select("id,event,error,received_at").order("received_at", { ascending: false }).limit(8);
  return data ?? [];
}

export default async function IntegracoesPage() {
  const today = todayBRT();
  const [ds, origin, logs] = await Promise.all([loadDataset(today, today), appOrigin(), recentWebhooks()]);
  const webhookUrl = `${origin}/api/webhooks/cakto/${ds.settings.webhook_token}`;

  return (
    <>
      <PageHeader title="Integrações" subtitle="Conecte a Cakto (vendas) e o Meta Ads (gastos)." />

      {!isSupabaseConfigured && (
        <Card className="mb-4 border-warn/40 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" />
            <div className="text-sm text-text-2">
              <p className="font-semibold text-text">Primeiro passo: configurar o Supabase (grátis)</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>
                  Crie um projeto em{" "}
                  <a className="text-primary hover:underline" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
                    supabase.com
                  </a>
                  .
                </li>
                <li>
                  No <b>SQL Editor</b>, cole e rode o arquivo <code className="font-mono">supabase/schema.sql</code> deste projeto.
                </li>
                <li>
                  Em <b>Project Settings → API Keys</b>, copie a URL, a <i>publishable key</i> e a <i>secret key</i> para o{" "}
                  <code className="font-mono">.env.local</code> (modelo em <code className="font-mono">.env.local.example</code>).
                </li>
                <li>Reinicie o servidor e crie sua conta em /cadastro.</li>
              </ol>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ── Cakto ── */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Webhook className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-text">Cakto</h2>
              <p className="text-xs text-muted">Vendas chegam em tempo real via webhook</p>
            </div>
          </div>

          <CopyField label="URL do webhook" value={webhookUrl} />

          <ol className="mt-5 flex flex-col gap-3">
            <Step n={1}>
              Na Cakto, vá em <b>Integrações → Webhooks → Adicionar</b>.
            </Step>
            <Step n={2}>Cole a URL acima e selecione os produtos que quer rastrear.</Step>
            <Step n={3}>
              Marque os eventos: <b>Compra aprovada</b>, <b>Compra recusada</b>, <b>Pix gerado</b>, <b>Boleto gerado</b>, <b>Reembolso</b>, <b>Chargeback</b> e{" "}
              <b>Renovação de assinatura</b>.
            </Step>
            <Step n={4}>
              (Opcional, recomendado) copie o <b>secret</b> que a Cakto mostra e cole abaixo — webhooks sem ele serão recusados.
            </Step>
          </ol>

          <div className="mt-5 border-t border-border pt-4">
            <SecretForm value={ds.settings.cakto_secret} />
          </div>

          {isSupabaseConfigured && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium text-text-2">Últimos webhooks recebidos</p>
              {logs.length === 0 ? (
                <p className="text-sm text-muted">Nenhum ainda. Use o botão “Testar” na Cakto para enviar um.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {logs.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-sm">
                      {l.error ? <AlertTriangle className="size-4 text-bad" /> : <CheckCircle2 className="size-4 text-good" />}
                      <code className="font-mono text-xs text-text">{l.event ?? "—"}</code>
                      {l.error && <span className="truncate text-xs text-bad">{l.error}</span>}
                      <span className="ml-auto text-xs text-muted tabular">{formatDateTime(l.received_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        {/* ── Meta ── */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Megaphone className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-text">Meta Ads</h2>
              <p className="text-xs text-muted">Gastos, cliques e checkouts por campanha</p>
            </div>
          </div>

          <MetaTokenForm hasToken={ds.settings.has_meta_token} />

          <details className="group mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-text-2">
            <summary className="cursor-pointer font-medium text-text">Como gerar um token que não expira</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-4">
              <li>
                Abra o{" "}
                <a className="inline-flex items-center gap-1 text-primary hover:underline" href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer">
                  Business Manager → Usuários do sistema <ExternalLink className="size-3" />
                </a>{" "}
                e crie um usuário do sistema (função Admin).
              </li>
              <li>Em “Adicionar ativos”, dê acesso às suas contas de anúncio (controle total ou só análise).</li>
              <li>
                Clique em <b>Gerar novo token</b>, escolha um app seu (crie um em developers.facebook.com se não tiver), validade <b>Nunca</b>, e marque as permissões{" "}
                <code className="font-mono">ads_read</code> e <code className="font-mono">business_management</code>.
              </li>
              <li>Cole o token acima. Ele fica salvo só no seu banco.</li>
            </ol>
          </details>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-text-2">Contas de anúncio rastreadas</p>
            {ds.accounts.length === 0 ? (
              <p className="text-sm text-muted">Conecte o token para listar suas contas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {ds.accounts.map((a) => (
                  <AccountToggle key={a.account_id} account={a} />
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">Os gastos sincronizam sozinhos ao abrir o painel (a cada 15 min) ou pelo botão de atualizar no topo.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
