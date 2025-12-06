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
  role: 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier';
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

    // Generate a random temporary password
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

    // The profile should be created automatically by the trigger,
    // but let's update it with additional info
    if (authData.user) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          cpf: cpf || null,
          pdv_id: pdvId && pdvId !== 'none' ? pdvId : null,
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user?.id,
        message: 'User created successfully. They can login with their email.',
        tempPassword, // In production, send this via email instead
      }),
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