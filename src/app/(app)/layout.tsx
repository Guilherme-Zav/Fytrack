import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/Logo";
import { MobileNav, Sidebar } from "@/components/shell/Sidebar";
import { SyncButton } from "@/components/shell/SyncButton";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { UserMenu } from "@/components/shell/UserMenu";
import { loadShell } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadShell();
  const lastSync = shell.accounts
    .map((a) => a.last_synced_at)
    .filter(Boolean)
    .sort()[0] as string | undefined;

  return (
    <div className="flex min-h-dvh">
      <Suspense>
        <Sidebar footer={<UserMenu email={shell.email} demo={shell.demo} />} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        {shell.demo && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-primary/20 bg-primary-soft px-4 py-2 text-center text-[13px] text-primary">
            <Sparkles className="size-4" />
            <span>
              <b>Modo demonstração</b> — dados fictícios. Configure o Supabase no <code className="font-mono">.env.local</code> para usar com suas vendas reais.
            </span>
            <Link href="/integracoes" className="font-semibold underline underline-offset-2">
              Como configurar
            </Link>
          </div>
        )}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur md:px-6">
          <Suspense>
            <MobileNav />
          </Suspense>
          <div className="lg:hidden">
            <LogoMark size={28} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SyncButton lastSyncedAt={lastSync ?? null} enabled={shell.accounts.length > 0} demo={shell.demo} />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
