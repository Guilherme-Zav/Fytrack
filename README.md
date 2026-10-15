# FYTRACKER

Painel próprio de rastreamento de campanhas (estilo UTMify): junta os **gastos do Meta Ads** com as **vendas da Cakto** e mostra lucro, ROAS, CPA, ROI e margem por campanha, conjunto e anúncio.

- **Stack:** Next.js 15 (App Router) + Supabase (Postgres + Auth) + Tailwind 4 + Recharts
- **Custo:** zero — Supabase free tier + Vercel Hobby
- **Temas:** claro (azul) e escuro (violeta), botão no topo

## Rodar local

```bash
npm install
npm run dev
```

Sem o `.env.local` o app abre em **modo demonstração**, com dados fictícios, só para ver o painel.

## Configurar de verdade

1. Crie um projeto em [supabase.com](https://supabase.com/dashboard).
2. **SQL Editor** → cole e rode [`supabase/schema.sql`](supabase/schema.sql).
3. Copie `.env.local.example` para `.env.local` e preencha a URL, a publishable key e a secret key (Project Settings → API Keys).
4. Reinicie o `npm run dev`, abra `/cadastro` e crie sua conta.
5. **Integrações** no app:
   - **Cakto:** copie a URL do webhook e cadastre na Cakto (Integrações → Webhooks) com os eventos de compra aprovada/recusada, Pix/boleto gerado, reembolso e chargeback.
   - **Meta:** cole um token de usuário do sistema (Business Manager) com `ads_read` e marque as contas de anúncio.
6. **UTMs & Script** no app:
   - Cole os parâmetros de URL nos anúncios do Meta (mesmo padrão da UTMify).
   - Cole o `<script>` na sua página de vendas para repassar as UTMs ao checkout da Cakto.
7. **Configurações:** informe o % de imposto e o custo de cada produto.

> O webhook só recebe vendas quando o app está publicado na internet. Para testar local, use um túnel (ex.: `ngrok http 3000`) e defina `NEXT_PUBLIC_APP_URL` com a URL do túnel.

## Publicar na Vercel (grátis)

1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. Em **Environment Variables**, adicione as mesmas variáveis do `.env.local` (e `NEXT_PUBLIC_APP_URL` com o domínio da Vercel).
4. No Supabase → Authentication → URL Configuration, coloque o domínio da Vercel em **Site URL**.
5. Atualize a URL do webhook na Cakto e o script na página de vendas para o novo domínio.

## Como os números são calculados

| Métrica | Fórmula |
|---|---|
| Faturamento líquido | soma do que fica com você em cada venda aprovada (comissão de produtor da Cakto) |
| Lucro | líquido − gastos com anúncios − impostos − custo dos produtos |
| ROAS | líquido ÷ gastos |
| ROI | lucro ÷ (gastos + custo dos produtos) |
| Margem | lucro ÷ líquido |
| CPA | gastos ÷ vendas aprovadas |
| Taxa de aprovação | (aprovadas + reembolsadas + chargebacks) ÷ todas as tentativas do método |

Datas seguem o horário de Brasília. A venda entra no dia do pagamento (ou da criação, se ainda pendente).

## Estrutura

```
src/app/(app)/        telas: resumo, campanhas, vendas, utms, integracoes, configuracoes
src/app/api/webhooks/cakto/[token]   recebe os webhooks da Cakto
src/app/api/meta/sync                puxa insights/status/orçamentos do Meta
src/app/utm.js                       script de UTM para a página de vendas
src/lib/metrics.ts                   todos os cálculos
src/lib/cakto.ts                     leitura do payload da Cakto + atribuição por UTM
src/lib/meta.ts                      Graph API do Meta
src/lib/demo.ts                      dados do modo demonstração
supabase/schema.sql                  tabelas + RLS
```
