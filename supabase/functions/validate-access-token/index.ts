import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateTokenRequest {
  token: string;
  userAgent?: string;
  ipAddress?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { token, userAgent, ipAddress }: ValidateTokenRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find profile by access token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, modules, pdv_id, status, token_valido_ate')
      .eq('access_token', token)
      .single();

    if (profileError || !profile) {
      console.log('Token not found:', token);
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_token', message: 'Link inválido ou inexistente' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    if (profile.token_valido_ate) {
      const expirationDate = new Date(profile.token_valido_ate);
      if (expirationDate < new Date()) {
        console.log('Token expired for user:', profile.email);
        return new Response(
          JSON.stringify({ success: false, error: 'expired_token', message: 'Link expirado. Solicite um novo link ao administrador.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if user is active
    if (profile.status !== 'active') {
      console.log('User account not active:', profile.email);
      return new Response(
        JSON.stringify({ success: false, error: 'inactive_account', message: 'Sua conta ainda não foi ativada. Aguarde aprovação do administrador.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the auth user by email
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing auth users:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to authenticate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUser = authUsers.users.find(u => u.email === profile.email);
    
    if (!authUser) {
      console.error('Auth user not found for email:', profile.email);
      return new Response(
        JSON.stringify({ success: false, error: 'User authentication not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine base URL for redirect
    const siteUrl = Deno.env.get('SITE_URL');
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '');
    const baseUrl = siteUrl || requestOrigin || 'https://gestao-e-marketing.lovable.app';

    // Determine redirect based on role
    const redirectByRole: Record<string, string> = {
      'manager': '/modules',
      'director': '/modules',
      'coordenador_compras': '/merchandising/materials',
      'convenience_coordinator': '/modules',
      'admin': '/admin',
      'collaborator': '/modules',
      'supplier': '/media/service-orders',
    };

    const redirectPath = redirectByRole[profile.role] || '/modules';

    // Generate a magic link / session for the user with redirect to correct domain
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: {
        redirectTo: `${baseUrl}${redirectPath}`,
      },
    });

    if (sessionError) {
      console.error('Error generating session:', sessionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last access timestamp
    await supabaseAdmin
      .from('profiles')
      .update({ ultimo_acesso_via_link: new Date().toISOString() })
      .eq('id', profile.id);

    // Log the access
    await supabaseAdmin
      .from('access_logs')
      .insert({
        user_id: profile.id,
        token_usado: token,
        tipo_acesso: 'link',
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      });

    console.log(`Token validated for user ${profile.email}, redirecting to ${redirectPath}`);

    return new Response(
      JSON.stringify({
        success: true,
        magicLink: sessionData.properties?.action_link,
        profile: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          modules: profile.modules,
        },
        redirectTo: redirectPath,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-access-token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
