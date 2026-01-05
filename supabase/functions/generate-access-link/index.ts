import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateLinkRequest {
  userId: string;
  validityDays?: number;
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

    // Verify the requesting user is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is super_admin
    const { data: requestingProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!requestingProfile || requestingProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only super admins can generate access links' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, validityDays = 365 }: GenerateLinkRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target user exists and is not super_admin
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();

    if (profileError || !targetProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetProfile.role === 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot generate access link for super admins' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique token using database function
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .rpc('generate_access_token');

    if (tokenError) {
      console.error('Error generating token:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Update profile with new access token
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        access_token: accessToken,
        token_gerado_em: new Date().toISOString(),
        token_valido_ate: expiresAt.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use SITE_URL if configured, otherwise use request origin
    const siteUrl = Deno.env.get('SITE_URL');
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '');
    const baseUrl = siteUrl || requestOrigin || 'https://gestao-e-marketing.lovable.app';
    const accessLink = `${baseUrl}/acesso/${accessToken}`;

    console.log(`Access link generated for user ${targetProfile.email}: ${accessLink}`);

    return new Response(
      JSON.stringify({
        success: true,
        accessLink,
        token: accessToken,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: targetProfile.id,
          name: targetProfile.name,
          email: targetProfile.email,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-access-link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
