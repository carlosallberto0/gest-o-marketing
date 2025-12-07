import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const testUsers = [
  {
    name: "João Diretor",
    email: "diretor.teste@redesaoroque.com.br",
    role: "director",
    modules: ["media", "merchandising"],
  },
  {
    name: "Maria Gerente",
    email: "gerente.teste@redesaoroque.com.br",
    role: "manager",
    modules: ["media", "merchandising"],
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results = [];

    for (const user of testUsers) {
      console.log(`Creating user: ${user.name} (${user.email})`);
      
      // Generate a random temporary password
      const tempPassword = crypto.randomUUID().slice(0, 12);

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === user.email);

      if (userExists) {
        console.log(`User ${user.email} already exists, skipping...`);
        results.push({
          email: user.email,
          name: user.name,
          status: 'already_exists',
          message: 'Usuário já existe no sistema',
        });
        continue;
      }

      // Create auth user
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          modules: user.modules,
        },
      });

      if (createError) {
        console.error(`Error creating user ${user.email}:`, createError);
        results.push({
          email: user.email,
          name: user.name,
          status: 'error',
          message: createError.message,
        });
        continue;
      }

      console.log(`User ${user.email} created successfully with ID: ${authData.user?.id}`);
      
      results.push({
        email: user.email,
        name: user.name,
        role: user.role,
        modules: user.modules,
        status: 'created',
        tempPassword,
        userId: authData.user?.id,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test users processing completed',
        users: results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-test-users function:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
