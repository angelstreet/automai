'use client';

import { useEffect, useMemo } from 'react';
import { NavGroup } from '@/components/layout/NavGroup';
import { NavUser } from '@/components/layout/NavUser';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/user';
import * as React from 'react';

import { sidebarData } from './data/sidebarData';

// Wrap the component with React.memo to prevent unnecessary re-renders
const AppSidebar = React.memo(function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { role } = useRole();
  const { open } = useSidebar();
  const isCollapsed = !open;

  // Always call useMemo hooks in the same order, regardless of conditions
  // Create empty/default values for the memoized data when user is not available
  const userRole = role as Role;
  
  // Filter out empty sections based on user role - memoize this calculation
  const filteredNavGroups = useMemo(() => {
    // If no user, show nav items that an admin would see
    if (!user) {
      return sidebarData.navGroups.filter((group) => {
        // Show items accessible to admins
        const accessibleItems = group.items.filter((item) => {
          if (!item.roles) return true;
          // Show if admin has access
          return item.roles.includes('admin');
        });
        return accessibleItems.length > 0;
      });
    }
    
    // Existing logic for authenticated users
    return sidebarData.navGroups.filter((group) => {
      // Filter items in each group based on user role
      const accessibleItems = group.items.filter((item) => {
        if (!item.roles) return true;
        const hasAccess = item.roles.includes(userRole);
        return hasAccess;
      });

      // Only include groups that have at least one accessible item
      return accessibleItems.length > 0;
    });
  }, [user, userRole, sidebarData.navGroups]);

  // Get user avatar from metadata
  const avatarUrl = user?.user_metadata && (user.user_metadata as any)?.avatar_url || '';

  // IMPORTANT: Debug with unique timestamp to avoid cache issues - 2025-03-09-23:45
  console.log('🔍 DEBUG USER DATA - UNIQUE LOG');
  console.log('User object:', user);
  console.log('User metadata:', user?.user_metadata);
  if (user?.user_metadata) {
    console.log('Direct name in metadata:', user.user_metadata.name);
    console.log('Full name in metadata:', user.user_metadata.full_name);
    console.log('Raw user meta data:', (user.user_metadata as any)?.raw_user_meta_data);
    console.log('Preferred username:', user.user_metadata.preferred_username);
  }
  console.log('Name field directly on user:', user?.name);
  
  // Prepare user data for NavUser - memoize this calculation
  const userData = useMemo(() => {
    if (!user) return { name: 'Guest', email: '', avatar: undefined };
    
    // Handle different possible metadata structures from Supabase
    const userMetadata = user.user_metadata || {};
    
    // First check for name directly on user object (might be added by our code)
    let userName = user.name || '';
    
    // If no name directly on user, try various metadata locations
    if (!userName) {
      userName = 
        // Try direct access to metadata
        userMetadata.name || 
        // Try full_name which is sometimes used by OAuth providers
        (userMetadata as any)?.full_name || 
        // Try to get it from raw metadata if it's nested
        (userMetadata as any)?.raw_user_meta_data?.name ||
        // Try preferred_username which some providers use
        (userMetadata as any)?.preferred_username ||
        // Fall back to email username
        user.email?.split('@')[0] || 
        // Final fallback
        'Guest';
    }
    
    console.log('Resolved userName:', userName);
    
    return {
      name: userName || 'Guest', // Ensure name is never undefined
      email: user.email || '',
      avatar: avatarUrl,
    };
  }, [user, avatarUrl]);

  // Always render the sidebar with content, no more loading state for unauthenticated users
  // Updated version
  return (
    <Sidebar 
      collapsible="icon" 
      variant="floating" 
      className="fixed left-0 top-0 z-30 transition-all duration-200"
      {...props}
    >
      {!isCollapsed && (
        <SidebarHeader className="p-1.5">
          <TeamSwitcher />
        </SidebarHeader>
      )}
      <SidebarContent className={isCollapsed ? "pt-4" : "pt-2"}>
        {filteredNavGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="pb-2">
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

// Export the memoized component
export { AppSidebar };
