"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function UserMenu({ email, demo }: { email: string; demo: boolean }) {
  const router = useRouter();
  const initials = email.slice(0, 2).toUpperCase();

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-fg">{initials}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text">{email}</p>
        <p className="text-[11px] text-muted">{demo ? "Modo demonstração" : "Conta pessoal"}</p>
      </div>
      {!demo && (
        <button onClick={signOut} className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-hover hover:text-text" aria-label="Sair" title="Sair">
          <LogOut className="size-4" />
        </button>
      )}
    </div>
  );
}
