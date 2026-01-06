-- Permitir leitura pública das configurações da tela de login
CREATE POLICY "Allow public read for login screen settings"
ON public.system_settings FOR SELECT
TO anon, authenticated
USING (key IN ('login_screen_settings', 'public_app_url'));