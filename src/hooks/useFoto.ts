import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FotoBucket =
  | "pdv-fotos"
  | "outdoor-fotos"
  | "material-fotos"
  | "avaliacao-pdv-fotos"
  | "aprovacao-arquivos"
  | "demanda-criativa-arquivos"
  | "biblioteca-marca-arquivos"
  | "estudio-templates"
  | "estudio-elementos"
  | "estudio-composicoes";

// Buckets privados — path é sempre "{entidade_id}/{arquivo}" (ADR-009,
// migration 20260908160000_system_options_codigo_sequencial_fotos.sql).
// foto_url na tabela de negócio guarda esse path, nunca uma URL pública.
export function useUploadFoto(bucket: FotoBucket) {
  return useMutation({
    mutationFn: async ({ entidadeId, file }: { entidadeId: string; file: File }) => {
      const path = `${entidadeId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      return path;
    },
  });
}

// Bucket privado: não existe URL pública direta. Toda exibição passa por
// signed URL, gerada sob a mesma RLS de storage.objects do bucket.
export function useFotoSignedUrl(bucket: FotoBucket, path: string | null | undefined) {
  return useQuery({
    queryKey: ["foto-signed-url", bucket, path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 55 * 60 * 1000, // assinatura vale 1h; evita renovar a cada render
  });
}
