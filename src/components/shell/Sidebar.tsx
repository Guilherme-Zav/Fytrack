"use client";

import clsx from "clsx";
import { LayoutDashboard, Link2, Megaphone, Menu, Plug, Receipt, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/resumo", label: "Resumo", icon: LayoutDashboard, keepFilters: true },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone, keepFilters: true },
  { href: "/vendas", label: "Vendas", icon: Receipt, keepFilters: true },
  { href: "/utms", label: "UTMs & Script", icon: Link2 },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const FILTER_KEYS = ["periodo", "de", "ate", "conta", "produto", "fonte"];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const sp = useSearchParams();
  const filters = new URLSearchParams();
  FILTER_KEYS.forEach((k) => sp.get(k) && filters.set(k, sp.get(k)!));
  const qs = filters.toString();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, keepFilters }) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={keepFilters && qs ? `${href}?${qs}` : href}
            onClick={onNavigate}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-surface-hover hover:text-text",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ footer }: { footer?: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface/80 px-3 py-5 backdrop-blur lg:flex">
      <div className="px-2 pb-6">
        <Logo />
      </div>
      <NavLinks />
      <div className="mt-auto">{footer}</div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <div className="lg:hidden">
      <button className="grid size-9 place-items-center rounded-lg text-text-2 hover:bg-surface-hover" onClick={() => setOpen(true)} aria-label="Abrir menu">
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 border-r border-border bg-surface px-3 py-5">
            <div className="flex items-center justify-between px-2">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="text-text-2">
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
