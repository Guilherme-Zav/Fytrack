"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { btn, inputCls } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const ERROS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).",
  "User already registered": "Já existe uma conta com esse e-mail.",
  "Password should be at least 6 characters.": "A senha precisa ter pelo menos 6 caracteres.",
};

export function AuthForm({ mode }: { mode: "login" | "cadastro" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      router.push("/resumo");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = supabaseBrowser();
    const { data, error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/resumo` } });
    setBusy(false);
    if (error) return setError(ERROS[error.message] ?? error.message);
    if (mode === "cadastro" && !data.session) return setInfo("Conta criada! Enviamos um link de confirmação para o seu e-mail.");
    router.replace("/resumo");
    router.refresh();
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
          <div>
            <h1 className="text-lg font-semibold text-text">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
            <p className="mt-1 text-sm text-text-2">
              {mode === "login" ? "Acompanhe suas campanhas e vendas em tempo real." : "Leva menos de um minuto."}
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-2">
            E-mail
            <input className={inputCls} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-2">
            Senha
            <input
              className={inputCls}
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          {info && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{info}</p>}
          <button className={btn.primary} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          <p className="text-center text-sm text-text-2">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <Link href="/cadastro" className="font-medium text-primary">
                  Cadastre-se
                </Link>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <Link href="/login" className="font-medium text-primary">
                  Entrar
                </Link>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
