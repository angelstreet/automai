export { default as Sidebar } from './Sidebar';
export { SidebarProvider, useSidebar } from '@/context/SidebarContext';
export { SidebarTrigger } from './SidebarTrigger';
export { SidebarRail } from './SidebarRail';

// Layout components - consolidated exports
export {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  SidebarInset,
} from './SidebarLayout';

// Group components - consolidated exports
export {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
} from './SidebarGroups';

// Menu components - consolidated exports
export { SidebarMenu, SidebarMenuItem, SidebarMenuSub } from './SidebarMenuItems';

// Larger standalone components
export { SidebarMenuButton } from './SidebarMenuButton';
export { SidebarMenuSubButton } from './SidebarMenuSubButton';
export { SidebarInput } from './SidebarInput';

// Data exports
export { sidebarData, type SidebarData } from './sidebarData';
