import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  name: string;
  email: string;
  cpf?: string;
  role: 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier' | 'coordenador_compras' | 'convenience_coordinator';
  modules: ('media' | 'merchandising')[];
  pdvId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error('Unauthorized');
    }

    // Check if requesting user is admin
    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || !requestingProfile) {
      throw new Error('Could not verify user role');
    }

    if (!['super_admin', 'admin'].includes(requestingProfile.role)) {
      throw new Error('Only admins can create users');
    }

    const body: CreateUserRequest = await req.json();
    const { name, email, cpf, role, modules, pdvId } = body;

    console.log('Creating user:', { name, email, role, modules });

    // Generate a random temporary password (still needed for auth)
    const tempPassword = crypto.randomUUID().slice(0, 12);

    // Create auth user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        modules,
      },
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      throw new Error(createError.message);
    }

    console.log('Auth user created:', authData.user?.id);

    // For non-super_admin users, generate an access token
    let accessToken = null;
    let accessLink = null;
    let tokenExpiresAt = null;

    if (authData.user && role !== 'super_admin') {
      // Generate unique access token
      const { data: tokenData, error: tokenError } = await supabaseAdmin.rpc('generate_access_token');
      
      if (!tokenError && tokenData) {
        accessToken = tokenData;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 365); // 1 year validity
        tokenExpiresAt = expiresAt.toISOString();
        
        const baseUrl = Deno.env.get('SITE_URL') || 'https://sr-off-trade-marketing.lovable.app';
        accessLink = `${baseUrl}/acesso/${accessToken}`;
        
        console.log('Access link generated for user:', email);
      }
    }

    // Update profile with additional info
    if (authData.user) {
      const updateData: Record<string, unknown> = {
        cpf: cpf || null,
        pdv_id: pdvId && pdvId !== 'none' ? pdvId : null,
        status: 'active', // New users are active by default now
      };

      // For super_admin, store temp password
      if (role === 'super_admin') {
        updateData.temp_password = tempPassword;
      } else {
        // For other roles, store access token
        updateData.access_token = accessToken;
        updateData.token_gerado_em = new Date().toISOString();
        updateData.token_valido_ate = tokenExpiresAt;
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }
    }

    // Build response based on role
    const response: Record<string, unknown> = {
      success: true,
      userId: authData.user?.id,
      role,
    };

    if (role === 'super_admin') {
      response.message = 'Super Admin criado. Use a senha temporária para fazer login.';
      response.tempPassword = tempPassword;
    } else {
      response.message = 'Usuário criado. Compartilhe o link de acesso.';
      response.accessLink = accessLink;
      response.accessToken = accessToken;
      response.expiresAt = tokenExpiresAt;
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-user function:', errorMessage);
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
