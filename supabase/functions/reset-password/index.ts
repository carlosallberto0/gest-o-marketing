import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the requesting user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.log('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the requesting user is an admin
    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || !requestingProfile) {
      console.log('Could not fetch requesting user profile:', profileError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not verify user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['super_admin', 'admin'].includes(requestingProfile.role)) {
      console.log('User is not an admin:', requestingProfile.role);
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins can reset passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId }: ResetPasswordRequest = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resetting password for user: ${userId}`);

    // Generate a new temporary password
    const newPassword = crypto.randomUUID().slice(0, 12);
    console.log('Generated new temporary password');

    // Update password in auth.users
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateAuthError) {
      console.error('Error updating auth password:', updateAuthError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update password: ' + updateAuthError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY FIX: Do NOT store the password in plaintext
    // The password is returned only once for immediate display to the admin
    // Clear any existing temp_password for security
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ temp_password: null })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('Error clearing temp_password:', updateProfileError);
      // Non-critical error - password was still reset in auth
    }

    console.log('Password reset successfully for user:', userId);

    // SECURITY: Return password for one-time display only
    // Password is NOT stored in plaintext in the database anymore
    return new Response(
      JSON.stringify({ 
        success: true, 
        newPassword, // Only returned once for immediate display
        message: 'Password reset successfully. This password will not be stored.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
