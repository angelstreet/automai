import { AuthUser, User } from '@/types/user';

export const mapAuthUserToUser = (authUser: AuthUser): User => {
  if (!authUser.tenant_id) throw new Error('Missing tenant_id in user data');
  if (!authUser.tenant_name) throw new Error('Missing tenant_name in user data');

  const role = (authUser as any).role || authUser?.user_metadata?.role || 'viewer';
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email.split('@')[0] || 'Guest',
    role: role as any, // Adjust based on your Role type
    tenant_id: authUser.tenant_id,
    tenant_name: authUser.tenant_name,
    avatar_url: authUser.user_metadata?.avatar_url || '',
    user_metadata: authUser.user_metadata,
    teams: authUser.teams || [],
    selectedTeamId: authUser.selectedTeamId,
    teamMembers: authUser.teamMembers || [],
  };
};
