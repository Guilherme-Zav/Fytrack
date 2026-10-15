import { Package } from "lucide-react";
import { AddProductForm, ProductCostRow, TaxForm } from "@/components/forms";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { loadDataset } from "@/lib/data";
import { todayBRT } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const today = todayBRT();
  const ds = await loadDataset(today, today);

  return (
    <>
      <PageHeader title="Configurações" subtitle="Impostos e custos entram no cálculo de lucro, margem e ROI." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit p-5">
          <h2 className="font-semibold text-text">Imposto sobre o faturamento</h2>
          <p className="mb-4 mt-1 text-sm text-text-2">
            Percentual aplicado sobre o faturamento líquido. Ex.: Simples Nacional anexo III começa em 6%; MEI pode deixar 0.
          </p>
          <TaxForm value={ds.settings.tax_rate} />
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Custo por produto" subtitle="Custo por venda aprovada (entrega, frete, licença, coprodução fixa…)." />
          <div className="mt-3">
            {ds.products.length === 0 ? (
              <EmptyState icon={Package} title="Nenhum produto ainda" text="Os produtos aparecem aqui automaticamente quando a primeira venda chegar pela Cakto." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-surface-2 text-left text-xs text-muted">
                    <th className="px-5 py-2 font-medium">Produto</th>
                    <th className="px-5 py-2 text-right font-medium">Custo por venda</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.products.map((p) => (
                    <ProductCostRow key={p.external_id} product={p} />
                  ))}
                </tbody>
              </table>
            )}
            <div className="border-t border-border">
              <AddProductForm />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
