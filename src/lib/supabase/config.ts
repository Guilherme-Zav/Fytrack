export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** false enquanto o .env.local não tiver as chaves reais → o app roda em modo demonstração. */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("SEU-PROJETO") &&
  SUPABASE_KEY.length > 20 &&
  !SUPABASE_KEY.includes("SUA-CHAVE");
