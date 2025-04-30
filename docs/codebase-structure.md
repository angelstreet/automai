# Codebase Structure Reference

## Project Technologies

| Technology | Used | Version |
| ---------- | ---- | ------- |
| react      | ✅   | latest  |
| nextjs     | ✅   | 15.2.4  |
| typescript | ✅   | ^5.8.2  |
| tailwind   | ✅   | 3.4.1   |
| supabase   | ✅   | 2.49.1  |
| prisma     | ❌   | -       |
| trpc       | ❌   | -       |

## Key Project Areas

### Main Folders

- `src`: Main project folder

### UI Components

- `src/components`
- `src/components/dialog`
- `src/components/header`
- `src/components/icons`
- `src/components/layout`
- `src/components/profile`
- `src/components/settings`
- `src/components/shadcn`
- `src/components/sidebar`
- `src/components/team`
- `src/components/theme`
- `src/components/ui`

### API Routes

- `src/app/api`
- `src/types/api`

### Data Stores

- `src/app/providers`
- `src/context`
- `src/store`
- `src/types/context`

### Server Actions

- `src/app/actions`

## Directory Structure

```
📁 src
  📁 app
    📁 [locale]
      📁 (auth)
        📁 auth-redirect
          📄 page.tsx (typescript)
        📁 forgot-password
          📄 page.tsx (typescript)
        📁 login
          📄 page.tsx (typescript)
        📁 reset-password
          📄 page.tsx (typescript)
        📁 signup
          📄 page.tsx (typescript)
        📄 layout.tsx (typescript)
      📁 (marketing)
        📁 _components - UI components specific to the parent feature
          📁 client - Client-side components
            📄 Features.tsx (typescript)
            📄 Footer.tsx (typescript)
            📄 Hero.tsx (typescript)
            📄 SiteHeader.tsx (typescript)
          📄 index.ts (typescript)
        📄 layout.tsx (typescript)
      📁 [tenant]
        📁 _components - UI components specific to the parent feature
          📁 client - Client-side components
            📄 TenantLayoutClient.tsx (typescript)
        📁 billing
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 BillingActions.tsx (typescript)
            📄 BillingContent.tsx (typescript)
            📄 BillingSkeleton.tsx (typescript)
            📄 index.ts (typescript)
          📄 page.tsx (typescript)
        📁 cicd
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 CICDActionsClient.tsx (typescript)
              📄 CICDEventListener.tsx (typescript)
              📄 CICDFormDialogClient.tsx (typescript)
              📄 CICDTableClient.tsx (typescript)
            📄 CICDContent.tsx (typescript)
            📄 CICDSkeleton.tsx (typescript)
            📄 index.ts (typescript)
          📄 page.tsx (typescript)
        📁 dashboard
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 DashboardContent.tsx (typescript)
              📄 DashboardMainContentClient.tsx (typescript)
              📄 DashboardOverviewClient.tsx (typescript)
              📄 DashboardRecentSalesClient.tsx (typescript)
              📄 DashboardStatsCardsClient.tsx (typescript)
              📄 DashboardTabContentCardClient.tsx (typescript)
            📄 DashboardMainContent.tsx (typescript)
            📄 DashboardRecentSales.tsx (typescript)
            📄 DashboardStatsCards.tsx (typescript)
            📄 DashboardTabContentCard.tsx (typescript)
            📄 index.ts (typescript)
          📄 page.tsx (typescript)
        📁 deployment
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 DeploymentActionsClient.tsx (typescript)
              📄 DeploymentCustomSwitchClient.tsx (typescript)
              📄 DeploymentEmptyStateClient.tsx (typescript)
              📄 DeploymentEventListener.tsx (typescript)
              📄 DeploymentHostSelectorClient.tsx (typescript)
              📄 DeploymentContentClient.tsx (typescript)
              📄 DeploymentScriptSelectorClient.tsx (typescript)
              📄 DeploymentStatusBadgeClient.tsx (typescript)
              📄 DeploymentWizardDialogClient.tsx (typescript)
              📄 DeploymentWizardMainClient.tsx (typescript)
              📄 DeploymentWizardStep1Client.tsx (typescript)
              📄 DeploymentWizardStep2Client.tsx (typescript)
              📄 DeploymentWizardStep3Client.tsx (typescript)
              📄 DeploymentWizardStep4Client.tsx (typescript)
              📄 DeploymentWizardStep5Client.tsx (typescript)
            📄 DeploymentContent.tsx (typescript)
            📄 DeploymentNavbar.tsx (typescript)
            📄 DeploymentSkeleton.tsx (typescript)
            📄 DeploymentWizardContainer.tsx (typescript)
            📄 index.ts (typescript)
          📄 page.tsx (typescript)
          📄 types.ts (typescript)
        📁 devices
          📄 page.tsx (typescript)
        📁 hosts
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 HostActionsClient.tsx (typescript)
              📄 HostCardClient.tsx (typescript)
              📄 HostFormDialogClient.tsx (typescript)
              📄 HostGridClient.tsx (typescript)
              📄 HostListClient.tsx (typescript)
              📄 HostTableClient.tsx (typescript)
              📄 HostsEventListener.tsx (typescript)
              📄 index.ts (typescript)
            📄 HostContent.tsx (typescript)
            📄 HostSkeleton.tsx (typescript)
            📄 HostStatus.tsx (typescript)
            📄 index.ts (typescript)
          📄 page.tsx (typescript)
        📁 profile
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 ProfileContent.tsx (typescript)
              📄 ProfileContentClient.tsx (typescript)
            📄 ProfileContent.tsx (typescript)
            📄 ProfileSkeleton.tsx (typescript)
            📄 index.ts (typescript)
          📄 page.tsx (typescript)
        📁 reports
          📁 _components - UI components specific to the parent feature
            📄 ReportsContent.tsx (typescript)
          📄 index.ts (typescript)
          📄 page.tsx (typescript)
        📁 repositories
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 RepositoryActionsClient.tsx (typescript)
              📄 RepositoryCardClient.tsx (typescript)
              📄 RepositoryExplorerClient.tsx (typescript)
              📄 RepositoryFormDialogClient.tsx (typescript)
              📄 RepositoryListClient.tsx (typescript)
            📄 RepositoryContent.tsx (typescript)
            📄 RepositorySkeleton.tsx (typescript)
            📄 index.ts (typescript)
          📄 index.ts (typescript)
          📄 page.tsx (typescript)
        📁 settings
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 SettingsContent.tsx (typescript)
              📄 SettingsContentClient.tsx (typescript)
              📄 index.ts (typescript)
            📄 SettingsContent.tsx (typescript)
            📄 SettingsSkeleton.tsx (typescript)
            📄 index.ts (typescript)
          📁 profile
            📄 page.tsx (typescript)
          📄 page.tsx (typescript)
        📁 team
          📁 _components - UI components specific to the parent feature
            📁 client - Client-side components
              📄 TeamActionsClient.tsx (typescript)
              📄 TeamContentClient.tsx (typescript)
              📄 TeamMemberAddDialogClient.tsx (typescript)
              📄 TeamMemberDialogsClient.tsx (typescript)
              📄 TeamMemberPermissionsDialogClient.tsx (typescript)
              📄 TeamMembersTabClient.tsx (typescript)
            📄 TeamContentSkeleton.tsx (typescript)
            📄 TeamHeader.tsx (typescript)
            📄 TeamMembersTableSkeleton.tsx (typescript)
            📄 TeamOverview.tsx (typescript)
            📄 TeamOverviewSkeleton.tsx (typescript)
          📄 page.tsx (typescript)
        📄 layout.tsx (typescript)
        📄 page.tsx (typescript)
      📄 layout.tsx (typescript)
      📄 page.tsx (typescript)
    📁 actions - Server actions
      📄 README.md (documentation)
      📄 index.ts (server action)
    📁 api - API endpoints
      📄 README.md (documentation)
    📁 providers - Service providers
      📄 FontProvider.tsx (typescript)
      📄 PermissionProvider.tsx (typescript)
      📄 QueryProvider.tsx (typescript)
      📄 README.md (documentation)
      📄 SearchProvider.tsx (typescript)
      📄 SidebarProvider.tsx (typescript)
      📄 TeamMemberDialogProvider.tsx (typescript)
      📄 TeamProvider.tsx (typescript)
      📄 ThemeProvider.tsx (typescript)
      📄 ToastProvider.tsx (typescript)
      📄 UserProvider.tsx (typescript)
      📄 index.ts (typescript)
      📄 index.tsx (typescript)
    📁 themes
    📄 layout.tsx (typescript)
    📄 page.tsx (typescript)
  📁 components - UI components
    📁 dialog
      📄 CommandMenu.tsx (component)
      📄 ConfirmDialog.tsx (component)
    📁 header
      📄 HeaderClient.tsx (component)
      📄 HeaderEventListener.tsx (component)
      📄 HeaderSkeleton.tsx (component)
      📄 index.ts (component)
    📁 icons
      📄 ActivityLogIcon.tsx (component)
      📄 index.tsx (component)
    📁 layout
      📄 FeaturePageContainer.tsx (component)
      📄 PageHeader.tsx (component)
      📄 RoleSwitcher.tsx (component)
    📁 profile
      📄 ProfileDropDown.tsx (component)
    📁 settings
      📄 LanguageSettings.tsx (component)
    📁 shadcn
      📄 accordion.tsx (component)
      📄 alert-dialog.tsx (component)
      📄 alert.tsx (component)
      📄 avatar.tsx (component)
      📄 badge.tsx (component)
      📄 breadcrumb.tsx (component)
      📄 button.tsx (component)
      📄 card.tsx (component)
      📄 checkbox.tsx (component)
      📄 collapsible.tsx (component)
      📄 command.tsx (component)
      📄 dialog.tsx (component)
      📄 dropdown-menu.tsx (component)
      📄 form.tsx (component)
      📄 input.tsx (component)
      📄 label.tsx (component)
      📄 language-switcher.tsx (component)
      📄 pagination.tsx (component)
      📄 popover.tsx (component)
      📄 radio-group.tsx (component)
      📄 scroll-area.tsx (component)
      📄 search.tsx (component)
      📄 select.tsx (component)
      📄 separator.tsx (component)
      📄 sheet.tsx (component)
      📄 sidebar.tsx (component)
      📄 skeleton.tsx (component)
      📄 switch.tsx (component)
      📄 table.tsx (component)
      📄 tabs.tsx (component)
      📄 textarea.tsx (component)
      📄 theme-toggle.tsx (component)
      📄 tooltip.tsx (component)
    📁 sidebar
      📄 Sidebar.tsx (component)
      📄 SidebarClient.tsx (component)
      📄 SidebarLayout.tsx (component)
      📄 SidebarMenuButton.tsx (component)
      📄 SidebarMenuItems.tsx (component)
      📄 SidebarMenuSubButton.tsx (component)
      📄 SidebarNavigation.tsx (component)
      📄 SidebarRail.tsx (component)
      📄 SidebarSkeleton.tsx (component)
      📄 SidebarTrigger.tsx (component)
      📄 index.tsx (component)
    📁 team
      📄 CreatorBadge.tsx (component)
      📄 PermissionAwareActions.tsx (component)
      📄 PermissionAwareActionsWrapper.tsx (component)
      📄 TeamSelector.tsx (component)
      📄 TeamSelectorClient.tsx (component)
      📄 TeamSwitcher.tsx (component)
      📄 TeamSwitcherClient.tsx (component)
    📁 theme
      📄 ThemeToggleStatic.tsx (component)
      📄 index.ts (component)
    📁 ui
      📄 Breadcrumb.tsx (component)
      📄 EmptyState.tsx (component)
      📄 LoadingSpinner.tsx (component)
      📄 LongText.tsx (component)
      📄 PermissionGuard.tsx (component)
      📄 Progress.tsx (component)
      📄 Search.tsx (component)
      📄 resource-card.tsx (component)
  📁 config
  📁 context - React context providers
    📄 FontContext.tsx (context)
    📄 PermissionContext.tsx (context)
    📄 README.md (documentation)
    📄 SearchContext.tsx (context)
    📄 SidebarContext.tsx (context)
    📄 TeamContext.tsx (context)
    📄 TeamMemberDialogContext.tsx (context)
    📄 UserContext.tsx (context)
    📄 index.ts (context)
  📁 docs
  📁 hooks - React hooks for state management and logic
    📄 README.md (documentation)
    📄 index.ts (hook)
    📄 useMobile.tsx (hook)
  📁 i18n
    📁 messages
    📄 index.ts (typescript)
  📁 lib - Library code and services
    📁 config
    📁 db
    📁 git
    📁 services
      📁 cicd
        📄 index.ts (typescript)
        📄 types.ts (typescript)
      📄 index.ts (typescript)
    📁 supabase
      📄 client.ts (typescript)
      📄 index.ts (typescript)
    📁 utils - Utility functions
    📄 README.md (documentation)
    📄 index.ts (typescript)
  📁 pages
    📄 _document.tsx (typescript)
  📁 store
  📁 types - TypeScript type definitions
    📁 api - API endpoints
    📁 component
    📁 context - React context providers
    📁 db
    📁 service
    📄 README.md (documentation)
    📄 index.ts (type definition)
  📁 utils - Utility functions
  📄 config.ts (typescript)
```
