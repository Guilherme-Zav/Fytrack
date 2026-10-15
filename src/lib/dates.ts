import type { Filters, PeriodPreset } from "./types";

// O Brasil não tem horário de verão desde 2019: Brasília é sempre UTC-3.
export const TZ = "America/Sao_Paulo";
const OFFSET = "-03:00";

const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false });

/** yyyy-mm-dd do instante informado, no fuso de Brasília. */
export function dayInBRT(d: Date | string): string {
  return ymdFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function hourInBRT(d: Date | string): number {
  return Number(hourFmt.format(typeof d === "string" ? new Date(d) : d)) % 24;
}

export function todayBRT(): string {
  return dayInBRT(new Date());
}

/** Soma dias a uma data yyyy-mm-dd (sem fuso — aritmética de calendário). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const startISO = (ymd: string) => `${ymd}T00:00:00${OFFSET}`;
export const endISO = (ymd: string) => `${ymd}T23:59:59.999${OFFSET}`;

export const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "14d", label: "Últimos 14 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes", label: "Este mês" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "custom", label: "Personalizado" },
];

export function presetRange(preset: PeriodPreset, today = todayBRT()): { from: string; to: string } {
  switch (preset) {
    case "hoje":
      return { from: today, to: today };
    case "ontem": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "14d":
      return { from: addDays(today, -13), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "mes":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "mes_passado": {
      const firstThis = `${today.slice(0, 7)}-01`;
      const lastPrev = addDays(firstThis, -1);
      return { from: `${lastPrev.slice(0, 7)}-01`, to: lastPrev };
    }
    default:
      return { from: today, to: today };
  }
}

const isYmd = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
};

export function parseFilters(sp: SP): Filters {
  const rawPreset = one(sp, "periodo") as PeriodPreset | undefined;
  const preset: PeriodPreset = PRESETS.some((p) => p.value === rawPreset) ? rawPreset! : "hoje";
  let { from, to } = presetRange(preset);
  if (preset === "custom") {
    const f = one(sp, "de");
    const t = one(sp, "ate");
    if (isYmd(f) && isYmd(t)) {
      from = f <= t ? f : t;
      to = f <= t ? t : f;
    }
  }
  return {
    preset,
    from,
    to,
    account: one(sp, "conta") || null,
    product: one(sp, "produto") || null,
    source: one(sp, "fonte") || null,
  };
}

/** Período anterior de mesmo tamanho (para comparação). */
export function previousRange(from: string, to: string) {
  const len = diffDays(from, to) + 1;
  return { from: addDays(from, -len), to: addDays(from, -1) };
}

const longFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
export function formatDayShort(ymd: string): string {
  return longFmt.format(new Date(`${ymd}T12:00:00Z`)).replace(".", "");
}

export function describeRange(from: string, to: string): string {
  if (from === to) return formatDayShort(from);
  return `${formatDayShort(from)} – ${formatDayShort(to)}`;
}
