-- =============================================================================
-- Fix — policy de SELECT de storage.objects bloqueava upload em
-- estudio-templates e estudio-elementos (ordem de operações)
-- =============================================================================
--
-- BUG (achado em teste manual, 2026-09-21): o fluxo de criação de template
-- (EstudioTemplates.tsx) e de elemento (EstudioElementos.tsx) gera o id da
-- entidade no CLIENTE, faz o upload do arquivo para
-- {bucket}/{entidade_id}/{arquivo} e só DEPOIS insere a linha correspondente
-- em estudio_templates/estudio_elementos usando esse mesmo id.
--
-- O supabase-js sempre faz upload como
-- `INSERT ... ON CONFLICT (name, bucket_id) DO UPDATE ... RETURNING *`. No
-- Postgres, uma query com RETURNING só devolve a linha se ela também passar
-- pela policy de SELECT da tabela — não só pela de INSERT. As policies
-- estudio_templates_bucket_select / estudio_elementos_bucket_select (migration
-- 20260911140000) exigem que já EXISTA uma linha ativa em
-- estudio_templates/estudio_elementos referenciando aquele id — o que nunca é
-- verdade no momento do upload, já que a linha só é criada depois. Resultado:
-- toda tentativa de upload falhava com "new row violates row-level security
-- policy for table objects", mesmo com has_permission(...) = true.
--
-- estudio-composicoes NÃO tem esse bug: lá o upload (export final, em
-- EstudioColaborador.tsx) sempre acontece depois que a composição já existe
-- como rascunho — sem problema de ordem, não precisa de ajuste.
--
-- CORREÇÃO: adicionar uma segunda condição na policy de SELECT — quem tem
-- permissão de editar o recurso pode ver o arquivo mesmo antes da linha da
-- tabela existir (cobre a janela entre upload e insert). Quem não tem essa
-- permissão continua dependendo só da linha ativa existir, como antes.
-- =============================================================================

drop policy estudio_templates_bucket_select on storage.objects;

create policy estudio_templates_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estudio-templates'
    and (
      exists (
        select 1 from public.estudio_templates t
        where t.id::text = (storage.foldername(name))[1]
          and t.is_active = true
      )
      or public.has_permission('estudio', 'templates', 'editar', 'rede_toda')
    )
  );

drop policy estudio_elementos_bucket_select on storage.objects;

create policy estudio_elementos_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estudio-elementos'
    and (
      exists (
        select 1 from public.estudio_elementos e
        where e.id::text = (storage.foldername(name))[1]
          and e.is_active = true
      )
      or public.has_permission('estudio', 'templates', 'editar', 'rede_toda')
    )
  );
