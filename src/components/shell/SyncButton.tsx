"use client";

import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const STALE_MS = 15 * 60 * 1000;

function ago(iso: string | null) {
  if (!iso) return "nunca sincronizado";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
}

/** Puxa os gastos do Meta. Sincroniza sozinho ao abrir o painel se os dados tiverem mais de 15 min. */
export function SyncButton({ lastSyncedAt, enabled, demo }: { lastSyncedAt: string | null; enabled: boolean; demo: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);
  const auto = useRef(false);

  const sync = useCallback(async () => {
    if (demo) {
      setBusy(true);
      setTimeout(() => setBusy(false), 700);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao sincronizar");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao sincronizar");
    } finally {
      setBusy(false);
    }
  }, [demo, router]);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!enabled || demo || auto.current) return;
    const stale = !lastSyncedAt || Date.now() - Date.parse(lastSyncedAt) > STALE_MS;
    if (stale) {
      auto.current = true;
      sync();
    }
  }, [enabled, demo, lastSyncedAt, sync]);

  if (!enabled) return null;

  return (
    <button
      onClick={sync}
      disabled={busy}
      title={error ?? `Gastos do Meta atualizados ${ago(lastSyncedAt)}`}
      className={clsx(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
        error ? "border-bad/40 bg-bad-soft text-bad" : "border-border bg-surface text-text-2 hover:bg-surface-hover hover:text-text",
      )}
    >
      <RefreshCw className={clsx("size-4", busy && "animate-spin")} />
      <span className="hidden sm:inline">{busy ? "Sincronizando…" : error ? "Erro no Meta" : ago(lastSyncedAt)}</span>
    </button>
  );
}
