import clsx from "clsx";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { FilterBar } from "@/components/shell/FilterBar";
import { Card, EmptyState, PageHeader, StatTile, btn } from "@/components/ui";
import { describeRange } from "@/lib/dates";
import { money, moneyOrDash, num, ratio } from "@/lib/format";
import { adRows, summarize } from "@/lib/metrics";
import { loadPage } from "@/lib/page-data";
import type { EntityLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVELS: { value: EntityLevel; label: string; singular: string }[] = [
  { value: "campaign", label: "Campanhas", singular: "Campanha" },
  { value: "adset", label: "Conjuntos", singular: "Conjunto" },
  { value: "ad", label: "Anúncios", singular: "Anúncio" },
];

export default async function CampanhasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const level = (LEVELS.find((l) => l.value === sp.nivel)?.value ?? "campaign") as EntityLevel;
  const { filters, shell, ds, current } = await loadPage(Promise.resolve(sp));
  const rows = adRows(current.sales, current.insights, ds, level);
  const s = summarize(current.sales, current.insights, ds);
  const attributed = current.sales.filter((x) => x.status === "approved" && x.campaign_id).length;

  const linkFor = (nivel: EntityLevel) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "nivel") next.set(k, v);
    if (nivel !== "campaign") next.set("nivel", nivel);
    const qs = next.toString();
    return `/campanhas${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Campanhas" subtitle={`Meta Ads · ${describeRange(filters.from, filters.to)}`} />
      <div className="mb-5">
        <FilterBar filters={filters} accounts={shell.accounts} products={shell.products} sources={shell.sources} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Gastos" value={money(s.adSpend)} />
        <StatTile label="Vendas atribuídas" value={num(attributed)} sub={<span>de {num(s.approved.count)} aprovadas</span>} />
        <StatTile label="ROAS" value={ratio(s.roas)} />
        <StatTile label="CPA" value={moneyOrDash(s.cpa)} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex gap-1 border-b border-border px-4 pt-3">
          {LEVELS.map((l) => (
            <Link
              key={l.value}
              href={linkFor(l.value)}
              scroll={false}
              className={clsx(
                "-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition",
                level === l.value ? "border-primary text-primary" : "border-transparent text-text-2 hover:text-text",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
        {shell.accounts.length === 0 && !ds.demo ? (
          <EmptyState
            icon={Megaphone}
            title="Conecte sua conta do Meta"
            text="Assim que você conectar, os gastos, cliques e checkouts de cada campanha aparecem aqui junto com as vendas da Cakto."
            action={
              <Link href="/integracoes" className={btn.primary}>
                Ir para Integrações
              </Link>
            }
          />
        ) : (
          <CampaignTable rows={rows} levelLabel={LEVELS.find((l) => l.value === level)!.singular} showParent={level !== "campaign"} />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Vendas são ligadas às campanhas pelas UTMs (<code className="font-mono">utm_campaign</code>, <code className="font-mono">utm_medium</code> e{" "}
        <code className="font-mono">utm_content</code> com o id no final). Veja o padrão em{" "}
        <Link href="/utms" className="text-primary hover:underline">
          UTMs & Script
        </Link>
        .
      </p>
    </>
  );
}
