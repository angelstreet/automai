import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    console.log('[PROFILE_GET] Fetching user profile');

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Try to get session from Authorization header first
    const authHeader = request.headers.get('Authorization');
    let session = null;

    if (authHeader) {
      console.log('[PROFILE_GET] Authorization header present, extracting session');
      // Extract token from Bearer token
      const token = authHeader.replace('Bearer ', '');
      
      // Set session with token
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: '',
      });
      
      if (!error && data.session) {
        session = data.session;
      } else {
        console.log('[PROFILE_GET] Error extracting session from header:', error);
      }
    }

    // Fall back to cookie-based session if header auth fails
    if (!session) {
      console.log('[PROFILE_GET] No session from header, trying cookie-based session');
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        session = data.session;
      }
    }

    // Check if we have a valid session
    if (!session?.user) {
      console.log('[PROFILE_GET] No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('[PROFILE_GET] Valid session found for user:', userId);

    // Get user data from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log('[PROFILE_GET] User not found in database, creating user');

      // Try to create the user
      try {
        // Check if tenant exists, create if not
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', 'trial')
          .single();

        if (tenantError || !tenant) {
          console.log('[PROFILE_GET] Creating trial tenant');
          const { data: newTenant, error: createTenantError } = await supabase
            .from('tenants')
            .insert({
              id: 'trial',
              name: 'trial',
              plan: 'free',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            .select()
            .single();
            
          if (createTenantError) {
            console.error('[PROFILE_GET] Error creating tenant:', createTenantError);
          }
        }

        // Create user with admin role by default
        const { data: newUser, error: createUserError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: session.user.email,
            name: session.user.name || session.user.email?.split('@')[0] || 'User',
            user_role: session.user.user_role || 'admin', // Default to admin role
            tenant_id: (session.user.tenant_id || 'trial').toLowerCase(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select()
          .single();

        if (createUserError) {
          console.error('[PROFILE_GET] Error creating user:', createUserError);
          throw createUserError;
        }

        console.log('[PROFILE_GET] User created:', newUser.id);

        // Return the newly created user
        return NextResponse.json({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          user_role: newUser.user_role,
          tenant_id: newUser.tenant_id,
          tenant_name: 'trial',
          plan: 'free',
        });
      } catch (createError) {
        console.error('[PROFILE_GET] Error creating user:', createError);
        // Return session user data as fallback even if creation fails
        return NextResponse.json({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          user_role: session.user.user_role || 'admin', // Default to admin role
          tenant_id: (session.user.tenant_id || 'trial').toLowerCase(),
          tenant_name: (session.user.tenant_name || 'trial').toLowerCase(),
          plan: 'free',
        });
      }
    }

    // Get tenant data separately
    const { data: tenant, error: tenantError } = user.tenant_id
      ? await supabase
          .from('tenants')
          .select('*')
          .eq('id', user.tenant_id)
          .single()
      : { data: null, error: null };

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      user_role: user.user_role,
      tenant_id: user.tenant_id,
      tenant_name: tenant?.name || null,
      plan: tenant?.plan || 'free',
    };

    console.log('[PROFILE_GET] Returning user data:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[PROFILE_GET] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get the user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      );
    }

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update the user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name,
        updatedAt: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      user_role: updatedUser.user_role,
    });
  } catch (error) {
    console.error('[PROFILE_PATCH]', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
