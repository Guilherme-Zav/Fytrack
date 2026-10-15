"use client";

import clsx from "clsx";
import { Calendar, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PRESETS } from "@/lib/dates";
import type { AdAccount, Filters, Product } from "@/lib/types";

function SelectChip({
  icon,
  value,
  onChange,
  children,
  active,
  label,
}: {
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  active?: boolean;
  label: string;
}) {
  return (
    <label
      className={clsx(
        "relative inline-flex h-9 items-center gap-2 rounded-lg border pl-3 pr-8 text-sm transition",
        active ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-text hover:bg-surface-hover",
      )}
    >
      {icon}
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 opacity-60" />
    </label>
  );
}

export function FilterBar({
  filters,
  accounts,
  products,
  sources,
}: {
  filters: Filters;
  accounts: AdAccount[];
  products: Product[];
  sources: string[];
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.push(`${path}?${next.toString()}`, { scroll: false }));
  };

  return (
    <div className={clsx("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
      <SelectChip
        label="Período"
        icon={<Calendar className="size-4 opacity-70" />}
        value={filters.preset}
        onChange={(v) => set(v === "custom" ? { periodo: v, de: filters.from, ate: filters.to } : { periodo: v === "hoje" ? null : v, de: null, ate: null })}
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </SelectChip>

      {filters.preset === "custom" && (
        <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-sm">
          <input type="date" value={filters.from} max={filters.to} onChange={(e) => set({ de: e.target.value })} className="bg-transparent text-text outline-none" aria-label="Data inicial" />
          <span className="text-muted">→</span>
          <input type="date" value={filters.to} min={filters.from} onChange={(e) => set({ ate: e.target.value })} className="bg-transparent text-text outline-none" aria-label="Data final" />
        </div>
      )}

      {accounts.length > 1 && (
        <SelectChip label="Conta de anúncio" value={filters.account ?? ""} active={!!filters.account} onChange={(v) => set({ conta: v || null })}>
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.account_id} value={a.account_id}>
              {a.name}
            </option>
          ))}
        </SelectChip>
      )}

      <SelectChip label="Produto" value={filters.product ?? ""} active={!!filters.product} onChange={(v) => set({ produto: v || null })}>
        <option value="">Todos os produtos</option>
        {products.map((p) => (
          <option key={p.external_id} value={p.external_id}>
            {p.name}
          </option>
        ))}
      </SelectChip>

      {sources.length > 0 && (
        <SelectChip label="Fonte" value={filters.source ?? ""} active={!!filters.source} onChange={(v) => set({ fonte: v || null })}>
          <option value="">Todas as fontes</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectChip>
      )}

      {(filters.account || filters.product || filters.source) && (
        <button onClick={() => set({ conta: null, produto: null, fonte: null })} className="h-9 rounded-lg px-2 text-sm font-medium text-text-2 hover:text-text">
          Limpar filtros
        </button>
      )}
    </div>
  );
}
