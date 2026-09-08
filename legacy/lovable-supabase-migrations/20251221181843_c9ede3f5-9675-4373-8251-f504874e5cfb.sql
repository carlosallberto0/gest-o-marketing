-- Adicionar coluna temp_password na tabela profiles para armazenar a senha temporária
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password text;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.temp_password IS 'Senha temporária gerada no cadastro do usuário';