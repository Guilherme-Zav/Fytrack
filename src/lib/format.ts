const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const int = new Intl.NumberFormat("pt-BR");
const intCompact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1, minimumFractionDigits: 1 });
const dec2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (v: number) => brl.format(Number.isFinite(v) ? v : 0);
export const moneyCompact = (v: number) => (Math.abs(v) >= 10_000 ? brlCompact.format(v) : brl.format(v));
export const num = (v: number) => int.format(Math.round(v || 0));
export const numCompact = (v: number) => (Math.abs(v) >= 10_000 ? intCompact.format(v) : int.format(Math.round(v)));
/** v = fração (0.25 → 25,0%) */
export const percent = (v: number | null) => (v == null || !Number.isFinite(v) ? "—" : pct.format(v));
export const ratio = (v: number | null) => (v == null || !Number.isFinite(v) ? "—" : dec2.format(v));
export const moneyOrDash = (v: number | null) => (v == null || !Number.isFinite(v) ? "—" : brl.format(v));

export const safeDiv = (a: number, b: number): number | null => (b ? a / b : null);

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
