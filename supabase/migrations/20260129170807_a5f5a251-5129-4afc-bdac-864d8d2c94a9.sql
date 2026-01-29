-- Allow all authenticated users to read manager_menu_permissions
CREATE POLICY "Allow authenticated read manager_menu_permissions" 
ON system_settings FOR SELECT 
TO authenticated 
USING (key = 'manager_menu_permissions');