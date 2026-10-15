import { CheckCircle2 } from "lucide-react";
import { CopyField } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { appOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

const META_UTM =
  "utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}";

export default async function UtmsPage() {
  const origin = await appOrigin();
  const script = `<script src="${origin}/utm.js" async></script>`;

  return (
    <>
      <PageHeader title="UTMs & Script" subtitle="É isso que liga cada venda da Cakto ao anúncio que a gerou." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg">1</span>
            <h2 className="font-semibold text-text">Parâmetros de URL nos anúncios do Meta</h2>
          </div>
          <p className="mb-4 text-sm text-text-2">
            No Gerenciador de Anúncios, edite o anúncio → <b>Rastreamento</b> → <b>Parâmetros de URL</b> e cole:
          </p>
          <CopyField value={META_UTM} />
          <ul className="mt-4 flex flex-col gap-2 text-sm text-text-2">
            {[
              "Dá pra colar em vários anúncios de uma vez: selecione todos → Editar → Parâmetros de URL.",
              "É o mesmo padrão da UTMify: anúncios que já usam o padrão dela funcionam aqui sem mudar nada.",
              "O id depois do “|” é o que liga a venda à campanha, conjunto e anúncio — mesmo se você renomear.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg">2</span>
            <h2 className="font-semibold text-text">Script na página de vendas</h2>
          </div>
          <p className="mb-4 text-sm text-text-2">
            Cole antes do <code className="font-mono">&lt;/head&gt;</code> da sua landing page / página de vendas:
          </p>
          <CopyField value={script} />
          <p className="mt-4 text-sm text-text-2">O script:</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-text-2">
            {[
              "Guarda as UTMs da visita por 30 dias (se a pessoa voltar depois sem UTM, a venda continua atribuída).",
              "Repassa as UTMs para todos os links de checkout da Cakto (pay.cakto.com.br), inclusive botões criados depois.",
              "Não usa cookies de terceiros e pesa menos de 2 KB.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <h2 className="font-semibold text-text">Testar se está funcionando</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-text-2">
            <li>
              Abra sua página com <code className="font-mono">?utm_source=FB&utm_campaign=Teste|123456789</code> no final da URL.
            </li>
            <li>
              Passe o mouse no botão de compra: o link deve terminar com <code className="font-mono">utm_source=FB&utm_campaign=Teste%7C123456789</code>.
            </li>
            <li>Faça uma compra teste (ou use o teste de webhook da Cakto) e veja a venda em Vendas com a origem preenchida.</li>
          </ol>
        </Card>
      </div>
    </>
  );
}
