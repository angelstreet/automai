-- SQL for Supabase to create the RPC function
-- Run this in the Supabase SQL Editor to create a function that gets team members with user data
CREATE OR REPLACE FUNCTION public.get_team_members_with_user_data(p_team_id uuid)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH team_members_with_profiles AS (
    SELECT
      tm.team_id,
      tm.profile_id,
      tm.role,
      tm.created_at,
      tm.updated_at,
      p.avatar_url AS profile_avatar_url,
      p.tenant_id,
      p.tenant_name,
      p.role AS profile_role
    FROM
      public.team_members tm
      JOIN public.profiles p ON tm.profile_id = p.id
    WHERE
      tm.team_id = p_team_id
  )
  SELECT
    json_build_object(
      'team_id', tmp.team_id,
      'profile_id', tmp.profile_id,
      'role', tmp.role,
      'created_at', tmp.created_at,
      'updated_at', tmp.updated_at,
      'profiles', json_build_object(
        'id', tmp.profile_id,
        'avatar_url', tmp.profile_avatar_url,
        'tenant_id', tmp.tenant_id,
        'tenant_name', tmp.tenant_name,
        'role', tmp.profile_role
      ),
      'user', json_build_object(
        'id', au.id,
        'name', COALESCE(
          (au.raw_user_meta_data->>'full_name'),
          (au.raw_user_meta_data->>'name'),
          SPLIT_PART(au.email, '@', 1),
          tmp.tenant_name,
          'User'
        ),
        'email', au.email,
        'avatar_url', COALESCE(
          tmp.profile_avatar_url,
          (au.raw_user_meta_data->>'avatar_url')
        )
      )
    )
  FROM
    team_members_with_profiles tmp
    LEFT JOIN auth.users au ON tmp.profile_id = au.id;
END;
$$;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION public.get_team_members_with_user_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_members_with_user_data(uuid) TO service_role;
