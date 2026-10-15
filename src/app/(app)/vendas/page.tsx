import clsx from "clsx";
import Link from "next/link";
import { FilterBar } from "@/components/shell/FilterBar";
import { Card, PageHeader, SaleStatusBadge } from "@/components/ui";
import { describeRange } from "@/lib/dates";
import { formatDateTime, money, num } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/metrics";
import { loadPage } from "@/lib/page-data";
import type { SaleStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 50;
const TABS: { value: SaleStatus | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "approved", label: "Aprovadas" },
  { value: "pending", label: "Pendentes" },
  { value: "refused", label: "Recusadas" },
  { value: "refunded", label: "Reembolsadas" },
  { value: "chargeback", label: "Chargeback" },
];

const tail = (v: string | null) => (v ? v.split("|")[0] : null);

export default async function VendasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { filters, shell, current } = await loadPage(Promise.resolve(sp));
  const status = (TABS.find((t) => t.value === sp.status)?.value ?? "todas") as SaleStatus | "todas";
  const page = Math.max(1, Number(sp.pagina) || 1);

  const sorted = [...current.sales].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const list = status === "todas" ? sorted : sorted.filter((s) => s.status === status);
  const pageRows = list.slice((page - 1) * PAGE, page * PAGE);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const counts = Object.fromEntries(TABS.map((t) => [t.value, t.value === "todas" ? sorted.length : sorted.filter((s) => s.status === t.value).length]));

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") next.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `/vendas?${next.toString()}`;
  };

  return (
    <>
      <PageHeader title="Vendas" subtitle={`Cakto · ${describeRange(filters.from, filters.to)}`} />
      <div className="mb-5">
        <FilterBar filters={filters} accounts={shell.accounts} products={shell.products} sources={shell.sources} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={href({ status: t.value === "todas" ? null : t.value, pagina: null })}
              scroll={false}
              className={clsx(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm font-medium transition",
                status === t.value ? "border-primary text-primary" : "border-transparent text-text-2 hover:text-text",
              )}
            >
              {t.label}
              <span className="rounded-full bg-surface-2 px-1.5 text-xs text-muted tabular">{num(counts[t.value])}</span>
            </Link>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Data</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Cliente</th>
                <th className="px-3 py-2.5 font-medium">Produto</th>
                <th className="px-3 py-2.5 font-medium">Pagamento</th>
                <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                <th className="px-3 py-2.5 text-right font-medium">Líquido</th>
                <th className="px-5 py-2.5 font-medium">Origem</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="whitespace-nowrap px-5 py-2.5 text-text-2 tabular">{formatDateTime(s.occurred_at)}</td>
                  <td className="px-3 py-2.5">
                    <SaleStatusBadge status={s.status} />
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5">
                    <p className="truncate font-medium text-text">{s.customer_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted">{s.customer_email}</p>
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-text-2">{s.product_name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-text-2">{PAYMENT_LABEL[s.payment_method]}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-text tabular">{money(s.gross_amount)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-text-2 tabular">{money(s.net_amount)}</td>
                  <td className="max-w-[260px] px-5 py-2.5">
                    {s.utm_source ? (
                      <>
                        <p className="truncate text-text-2">
                          <span className="mr-1.5 rounded bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary">{s.utm_source}</span>
                          {tail(s.utm_campaign)}
                        </p>
                        {s.utm_content && <p className="truncate text-xs text-muted">{tail(s.utm_content)}</p>}
                      </>
                    ) : (
                      <span className="text-xs italic text-muted">sem rastreio</span>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted">
                    Nenhuma venda nesse período. Assim que a Cakto enviar o webhook, ela aparece aqui.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
            <span className="text-muted">
              Página {page} de {pages} · {num(list.length)} vendas
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={href({ pagina: String(page - 1) })} scroll={false} className="rounded-lg border border-border px-3 py-1.5 text-text-2 hover:bg-surface-hover">
                  Anterior
                </Link>
              )}
              {page < pages && (
                <Link href={href({ pagina: String(page + 1) })} scroll={false} className="rounded-lg border border-border px-3 py-1.5 text-text-2 hover:bg-surface-hover">
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
