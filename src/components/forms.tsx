"use client";

import clsx from "clsx";
import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/(app)/actions";
import { addProduct, saveCaktoSecret, saveMetaToken, saveProductCost, saveTaxRate, setAccountActive } from "@/app/(app)/actions";
import { btn, inputCls } from "@/components/ui";
import type { AdAccount, Product } from "@/lib/types";

export function CopyField({ value, label, mono = true }: { value: string; label?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-medium text-text-2">{label}</p>}
      <div className="flex items-stretch gap-2">
        <code className={clsx("min-w-0 flex-1 break-all rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-text", mono && "font-mono")}>{value}</code>
        <button onClick={copy} className={clsx(btn.secondary, "shrink-0")} aria-label="Copiar">
          {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
          <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
        </button>
      </div>
    </div>
  );
}

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p className={clsx("rounded-lg px-3 py-2 text-sm", result.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad")}>
      {result.ok ? (result.message ?? "Salvo.") : result.error}
    </p>
  );
}

function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));
  return { pending, result, run };
}

export function MetaTokenForm({ hasToken }: { hasToken: boolean }) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const { pending, result, run } = useAction();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveMetaToken(token));
      }}
    >
      <label className="text-xs font-medium text-text-2" htmlFor="meta-token">
        Token de acesso {hasToken && <span className="ml-1 rounded bg-good-soft px-1.5 py-0.5 text-good">conectado</span>}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="meta-token"
            className={clsx(inputCls, "pr-10 font-mono")}
            type={show ? "text" : "password"}
            placeholder={hasToken ? "•••••••• (cole um novo para trocar)" : "EAAB..."}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" aria-label={show ? "Ocultar token" : "Mostrar token"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <button className={btn.primary} disabled={pending || !token}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {hasToken ? "Atualizar" : "Conectar"}
        </button>
      </div>
      <Feedback result={result} />
    </form>
  );
}

export function AccountToggle({ account }: { account: AdAccount }) {
  const [active, setActive] = useState(account.active);
  const { pending, result, run } = useAction();
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-surface-hover">
      <input
        type="checkbox"
        checked={active}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.checked;
          setActive(v);
          run(() => setAccountActive(account.account_id, v));
        }}
        className="size-4 accent-[var(--primary)]"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{account.name}</p>
        <p className="text-xs text-muted">
          act_{account.account_id} · {account.currency ?? "—"}
        </p>
      </div>
      {pending && <Loader2 className="size-4 animate-spin text-muted" />}
      {result && !result.ok && <span className="text-xs text-bad">{result.error}</span>}
    </label>
  );
}

export function TaxForm({ value }: { value: number }) {
  const [rate, setRate] = useState(String(value).replace(".", ","));
  const { pending, result, run } = useAction();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveTaxRate(Number(rate.replace(",", "."))));
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative w-36">
          <input className={clsx(inputCls, "pr-8 tabular")} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-label="Imposto em %" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
        </div>
        <button className={btn.primary} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </button>
      </div>
      <Feedback result={result} />
    </form>
  );
}

export function SecretForm({ value }: { value: string | null }) {
  const [secret, setSecret] = useState(value ?? "");
  const { pending, result, run } = useAction();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveCaktoSecret(secret));
      }}
    >
      <div className="flex gap-2">
        <input className={clsx(inputCls, "font-mono")} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Secret do webhook (opcional)" aria-label="Secret do webhook da Cakto" />
        <button className={btn.secondary} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </button>
      </div>
      <Feedback result={result} />
    </form>
  );
}

export function ProductCostRow({ product }: { product: Product }) {
  const [cost, setCost] = useState(String(product.cost).replace(".", ","));
  const { pending, result, run } = useAction();
  const save = () => {
    const v = Number(cost.replace(",", "."));
    if (v !== product.cost) run(() => saveProductCost(product.external_id, v));
  };
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-2.5">
        <p className="font-medium text-text">{product.name}</p>
        <p className="font-mono text-xs text-muted">{product.external_id}</p>
      </td>
      <td className="px-5 py-2.5">
        <div className="flex items-center justify-end gap-2">
          {pending && <Loader2 className="size-4 animate-spin text-muted" />}
          {result?.ok && !pending && <Check className="size-4 text-good" />}
          {result && !result.ok && <span className="text-xs text-bad">{result.error}</span>}
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
            <input
              className={clsx(inputCls, "pl-9 text-right tabular")}
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              aria-label={`Custo de ${product.name}`}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

export function AddProductForm() {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const { pending, result, run } = useAction();
  return (
    <form
      className="flex flex-col gap-3 px-5 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const r = await addProduct(id, name, Number(cost.replace(",", ".")) || 0);
          if (r.ok) {
            setId("");
            setName("");
            setCost("");
          }
          return r;
        });
      }}
    >
      <p className="text-xs text-text-2">Os produtos são criados sozinhos quando chega a primeira venda. Você também pode cadastrar manualmente:</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_120px_auto]">
        <input className={inputCls} placeholder="ID do produto na Cakto" value={id} onChange={(e) => setId(e.target.value)} />
        <input className={inputCls} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="Custo R$" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        <button className={btn.secondary} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Adicionar
        </button>
      </div>
      <Feedback result={result} />
    </form>
  );
}
