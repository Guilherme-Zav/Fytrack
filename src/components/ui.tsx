import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { percent } from "@/lib/format";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("card", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4">
      <div>
        <h3 className="text-[15px] font-semibold text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="size-3.5 text-muted" aria-label={text} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-normal leading-snug text-text-2 opacity-0 shadow-lg transition group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

/**
 * Delta colorido pela direção × se subir é bom.
 * goodWhenUp=false para custos (CPA, gastos, reembolso).
 */
export function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-xs text-muted">sem comparação</span>;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular",
        Math.abs(value) < 0.005 ? "bg-surface-2 text-muted" : good ? "bg-good-soft text-good" : "bg-bad-soft text-bad",
      )}
    >
      <Icon className="size-3" />
      {percent(Math.abs(value))}
    </span>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  goodWhenUp,
  hint,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: number | null;
  goodWhenUp?: boolean;
  hint?: string;
  sub?: ReactNode;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-[13px] font-medium text-text-2">
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <span className="truncate">{label}</span>
        {hint && <InfoTip text={hint} />}
      </div>
      <div
        className={clsx(
          "text-[22px] font-semibold tracking-tight tabular",
          tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-text",
        )}
      >
        {value}
      </div>
      <div className="flex min-h-5 flex-wrap items-center gap-2 text-xs text-muted">
        {delta !== undefined && <Delta value={delta} goodWhenUp={goodWhenUp} />}
        {sub}
      </div>
    </Card>
  );
}

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-good-soft text-good",
  pending: "bg-warn-soft text-warn",
  refused: "bg-surface-2 text-text-2",
  refunded: "bg-bad-soft text-bad",
  chargeback: "bg-bad-soft text-bad",
};
const STATUS_LABEL: Record<string, string> = {
  approved: "Aprovada",
  pending: "Pendente",
  refused: "Recusada",
  refunded: "Reembolsada",
  chargeback: "Chargeback",
};

export function SaleStatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function AdStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted">—</span>;
  const active = status === "ACTIVE";
  const label = active ? "Ativo" : status.includes("PAUSED") ? "Pausado" : status === "DELETED" || status === "ARCHIVED" ? "Arquivado" : status.replaceAll("_", " ").toLowerCase();
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        active ? "bg-good-soft text-good" : "bg-surface-2 text-muted",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-fg shadow-sm transition hover:bg-primary-hover disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text transition hover:bg-surface-hover disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-text-2 transition hover:bg-surface-hover hover:text-text",
};

export const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-3 focus:ring-primary/15";

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <p className="mt-1 font-medium text-text">{title}</p>
      <p className="max-w-sm text-sm text-text-2">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
