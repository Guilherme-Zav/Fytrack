import "server-only";
import { dayInBRT, parseFilters, previousRange } from "./dates";
import { loadDataset, loadShell } from "./data";
import { applyFilters } from "./metrics";

type SP = Record<string, string | string[] | undefined>;

/** Filtros da URL + dados do período atual e do anterior (para os deltas). */
export async function loadPage(searchParams: Promise<SP>, withPrevious = false) {
  const filters = parseFilters(await searchParams);
  const prev = previousRange(filters.from, filters.to);
  const [ds, shell] = await Promise.all([loadDataset(withPrevious ? prev.from : filters.from, filters.to), loadShell()]);

  const inRange = (from: string, to: string) => ({
    ...ds,
    sales: ds.sales.filter((s) => {
      const d = dayInBRT(s.occurred_at);
      return d >= from && d <= to;
    }),
    insights: ds.insights.filter((i) => i.date >= from && i.date <= to),
  });

  const current = inRange(filters.from, filters.to);
  const previous = withPrevious ? inRange(prev.from, prev.to) : null;

  return {
    filters,
    shell,
    ds: current,
    current: applyFilters(current, filters),
    previous: previous ? applyFilters(previous, filters) : null,
  };
}
