import { createClient } from "@supabase/supabase-js";

// Cliente do Marketing OS novo (projeto qlezexylaixllhakpezv) — não confundir
// com o client antigo movido para legacy/frontend-lovable/ (projeto
// mgknzbjzwtkumdihzthd).
//
// Sem generic `Database` ainda: não há CLI do Supabase linkada nesta máquina
// para rodar `supabase gen types`, e nenhum código hoje consulta tabela
// nenhuma (auth pura). Gerar/escrever tipos quando o primeiro hook de dado
// precisar deles.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
