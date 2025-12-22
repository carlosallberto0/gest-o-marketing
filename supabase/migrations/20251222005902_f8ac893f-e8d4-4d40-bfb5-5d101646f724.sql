-- Alterar o status padrão de novos usuários para 'pending'
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'pending';