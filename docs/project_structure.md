# automai3 Project Structure

Generated on: 3/11/2025, 11:01:11 PM

## Directory Structure

```
📄 .env.example (Other, 0.59KB)
📄 .env.local (Other, 0.70KB)
📄 .eslintrc.json (JSON Configuration, 2.40KB)
📁 .github/
  📁 workflows/
    📄 nextjs.yml (Other, 3.34KB)
📄 .gitignore (Other, 0.30KB)
📄 .prettierrc (Other, 0.10KB)
📁 .vscode/
  📄 settings.json (JSON Configuration, 0.03KB)
📄 CLAUDE.md (Documentation, 7.39KB)
📄 README.md (Documentation, 3.42KB)
📄 components.json (JSON Configuration, 0.44KB)
📄 cspell.json (JSON Configuration, 0.25KB)
📁 docs/
  📄 api-standards.md (Documentation, 11.95KB)
  📄 appflow.md (Documentation, 6.28KB)
  📄 authentication.md (Documentation, 8.78KB)
  📄 backend.md (Documentation, 8.54KB)
  📄 businessplan.md (Documentation, 1.94KB)
  📄 codespace.md (Documentation, 4.08KB)
  📄 component-organization-plan.md (Documentation, 3.76KB)
  📄 corefeatures.md (Documentation, 6.58KB)
  📄 database-model.md (Documentation, 8.58KB)
  📄 deployment.md (Documentation, 47.39KB)
  📄 desktop.md (Documentation, 4.77KB)
  📄 frontend-architecture.md (Documentation, 11.18KB)
  📄 frontend.md (Documentation, 4.19KB)
  📄 index.md (Documentation, 1.67KB)
  📁 instructions/
    📄 backend.md (Documentation, 8.06KB)
    📄 desktop.md (Documentation, 8.02KB)
    📄 frontend.md (Documentation, 5.51KB)
    📄 websocket.md (Documentation, 4.19KB)
  📄 jenkins-diagram.md (Documentation, 9.02KB)
  📄 jenkins-fullguide.md (Documentation, 9.89KB)
  📁 jenkins-infrastructure/
    📁 terraform/
      📁 .terraform/
        📁 providers/
          📁 registry.terraform.io/
            📁 hashicorp/
              📁 google/
                📁 6.24.0/
                  📁 darwin_amd64/
                    📄 LICENSE.txt (Other, 16.37KB)
                    📄 terraform-provider-google_v6.24.0_x5 (Other, 113465.53KB)
      📄 .terraform.lock.hcl (Other, 1.13KB)
      📄 main.tf (Other, 3.71KB)
      📄 maint.tf (Other, 0.00KB)
      📄 terraform.tfstate (Other, 4.93KB)
      📄 terraform.tfvars (Other, 0.03KB)
  📄 login.md (Documentation, 7.72KB)
  📁 pages/
    📁 development/
      📄 projects.md (Documentation, 15.05KB)
      📄 usecase_edit.md (Documentation, 12.54KB)
      📄 usecases.md (Documentation, 7.08KB)
    📁 environment/
      📄 connect_clients.md (Documentation, 7.45KB)
      📄 virtualization.md (Documentation, 2.37KB)
    📄 projects.md (Documentation, 15.05KB)
    📄 usecase_edit.md (Documentation, 12.54KB)
    📄 usecases.md (Documentation, 21.89KB)
  📄 prd.md (Documentation, 2.68KB)
  📄 project-organization.md (Documentation, 4.51KB)
  📄 project.md (Documentation, 42.92KB)
  📄 project_structure.md (Documentation, 4.16KB)
  📄 repositories.md (Documentation, 5.57KB)
  📄 setup.md (Documentation, 6.45KB)
  📄 supabase-auth.md (Documentation, 28.72KB)
  📄 supabase-integration.md (Documentation, 6.93KB)
  📄 supabase-setup.md (Documentation, 12.48KB)
  📄 techstack.md (Documentation, 6.96KB)
📁 electron/
  📄 main.js (JavaScript, 14.60KB)
  📄 preload.js (JavaScript, 0.73KB)
📄 eslint.config.mjs (Other, 2.79KB)
📄 global.d.ts (TypeScript, 0.09KB)
📄 jest.config.e2e.js (JavaScript, 0.28KB)
📄 jest.config.js (JavaScript, 0.12KB)
📄 next-env.d.ts (TypeScript, 0.21KB)
📄 next.config.js (JavaScript, 2.38KB)
📄 package-lock.json (JSON Configuration, 638.73KB)
📄 package.json (JSON Configuration, 5.78KB)
📄 postcss.config.js (JavaScript, 0.08KB)
📁 public/
  📁 avatars/
    📄 01.svg (Other, 0.40KB)
    📄 02.svg (Other, 0.40KB)
    📄 03.svg (Other, 0.40KB)
    📄 04.svg (Other, 0.40KB)
    📄 05.svg (Other, 0.40KB)
    📄 default.svg (Other, 0.24KB)
📁 scripts/
  📄 generate-structure.js (JavaScript, 3.67KB)
📄 server.ts (TypeScript, 4.08KB)
📁 src/
  📁 app/
    📁 [locale]/
      📁 (auth)/
        📁 auth-redirect/
          📄 page.tsx (TypeScript, 3.73KB)
        📁 forgot-password/
          📄 page.tsx (TypeScript, 4.10KB)
        📄 layout.tsx (TypeScript, 0.25KB)
        📁 login/
          📄 page.tsx (TypeScript, 11.05KB)
        📁 reset-password/
          📄 page.tsx (TypeScript, 4.83KB)
        📁 signup/
          📄 page.tsx (TypeScript, 8.42KB)
      📁 (marketing)/
        📁 _components/
          📄 ComingSoon.tsx (TypeScript, 0.51KB)
          📄 Features.tsx (TypeScript, 2.44KB)
          📄 Hero.tsx (TypeScript, 1.66KB)
          📄 SkipToMain.tsx (TypeScript, 0.40KB)
        📄 layout.tsx (TypeScript, 0.33KB)
      📁 [tenant]/
        📁 admin/
          📁 logs/
            📄 page.tsx (TypeScript, 1.58KB)
        📁 billing/
          📄 page.tsx (TypeScript, 0.19KB)
        📁 dashboard/
          📁 _components/
            📄 DashboardHeader.tsx (TypeScript, 0.45KB)
            📄 DashboardTabs.tsx (TypeScript, 1.15KB)
            📄 MainContent.tsx (TypeScript, 4.67KB)
            📄 StatsCards.tsx (TypeScript, 2.33KB)
            📄 TabContentCard.tsx (TypeScript, 0.53KB)
          📄 actions.ts (TypeScript, 3.63KB)
          📄 page.tsx (TypeScript, 0.29KB)
        📁 deployment/
          📁 _components/
            📄 DeploymentDetailsModal.tsx (TypeScript, 16.43KB)
            📄 DeploymentForm.tsx (TypeScript, 7.35KB)
            📄 DeploymentList.tsx (TypeScript, 5.74KB)
            📄 DeploymentListItem.tsx (TypeScript, 2.65KB)
            📄 DeploymentView.tsx (TypeScript, 4.01KB)
            📄 HostSelector.tsx (TypeScript, 3.02KB)
            📄 ScriptSelector.tsx (TypeScript, 2.45KB)
            📄 StatusBadge.tsx (TypeScript, 1.72KB)
            📄 data.ts (TypeScript, 6.19KB)
            📄 types.ts (TypeScript, 0.80KB)
            📄 utils.ts (TypeScript, 1.31KB)
          📄 page.tsx (TypeScript, 0.26KB)
        📁 development/
          📁 projects/
            📄 page.tsx (TypeScript, 13.73KB)
          📁 usecases/
            📁 edit/
              📁 [useCaseId]/
                📄 page.tsx (TypeScript, 1.63KB)
            📄 page.tsx (TypeScript, 1.38KB)
        📁 devices/
          📄 page.tsx (TypeScript, 0.19KB)
        📁 hosts/
          📁 [id]/
            📄 page.tsx (TypeScript, 0.84KB)
          📁 _components/
            📄 ConnectHostDialog.tsx (TypeScript, 6.73KB)
            📄 ConnectionForm.tsx (TypeScript, 12.76KB)
            📄 HostCard.tsx (TypeScript, 10.14KB)
            📄 HostGrid.tsx (TypeScript, 1.38KB)
            📄 HostList.tsx (TypeScript, 4.49KB)
            📄 HostOverview.tsx (TypeScript, 6.76KB)
            📄 HostSettings.tsx (TypeScript, 3.44KB)
            📄 HostTable.tsx (TypeScript, 5.36KB)
            📄 StatusSummary.tsx (TypeScript, 3.74KB)
          📁 analytics/
            📄 page.tsx (TypeScript, 0.14KB)
          📄 constants.ts (TypeScript, 0.00KB)
          📁 logs/
            📄 page.tsx (TypeScript, 4.58KB)
          📄 page.tsx (TypeScript, 0.11KB)
          📁 settings/
            📄 page.tsx (TypeScript, 7.21KB)
          📁 terminals/
            📄 page.tsx (TypeScript, 4.13KB)
        📄 layout.tsx (TypeScript, 1.48KB)
        📄 page.tsx (TypeScript, 0.11KB)
        📁 platforms/
          📄 constants.ts (TypeScript, 0.24KB)
        📁 profile/
          📄 page.tsx (TypeScript, 0.14KB)
        📁 projects/
          📄 page.tsx (TypeScript, 0.32KB)
        📁 reports/
          📄 page.tsx (TypeScript, 0.61KB)
        📁 repositories/
          📁 [id]/
            📄 page.tsx (TypeScript, 0.92KB)
          📁 _components/
            📄 AddGitProviderDialog.tsx (TypeScript, 11.70KB)
            📄 GitProviderCard.tsx (TypeScript, 6.62KB)
            📄 GitProviderGrid.tsx (TypeScript, 3.19KB)
            📄 RepositoryCard.tsx (TypeScript, 4.32KB)
            📄 RepositoryGrid.tsx (TypeScript, 3.40KB)
            📄 RepositoryTable.tsx (TypeScript, 8.72KB)
            📄 index.ts (TypeScript, 0.32KB)
          📄 page.tsx (TypeScript, 17.59KB)
        📁 scripts/
          📄 page.tsx (TypeScript, 0.65KB)
        📁 settings/
          📄 layout.tsx (TypeScript, 0.51KB)
          📄 page.tsx (TypeScript, 0.81KB)
          📁 profile/
            📄 page.tsx (TypeScript, 1.44KB)
        📁 team/
          📄 page.tsx (TypeScript, 0.65KB)
        📁 terminals/
          📁 [hostName]/
            📄 page.tsx (TypeScript, 11.95KB)
          📁 _components/
            📄 Terminal.tsx (TypeScript, 21.68KB)
          📄 page.tsx (TypeScript, 2.63KB)
        📁 tests/
          📄 page.tsx (TypeScript, 0.65KB)
        📁 usecases/
          📁 _components/
            📄 CreateUseCase.tsx (TypeScript, 2.92KB)
            📄 UseCaseList.tsx (TypeScript, 2.63KB)
      📄 layout.tsx (TypeScript, 1.36KB)
      📄 page.tsx (TypeScript, 0.68KB)
      📁 projects/
        📁 [id]/
          📄 page.tsx (TypeScript, 0.83KB)
        📄 page.tsx (TypeScript, 6.71KB)
    📁 actions/
      📄 auth.ts (TypeScript, 6.50KB)
      📄 git-providers.ts (TypeScript, 9.19KB)
      📄 hosts.ts (TypeScript, 6.88KB)
      📄 index.ts (TypeScript, 0.11KB)
      📄 projects.ts (TypeScript, 3.57KB)
      📄 repositories.ts (TypeScript, 3.99KB)
      📄 session.ts (TypeScript, 0.40KB)
      📄 user.ts (TypeScript, 4.99KB)
    📁 api/
      📁 admin/
        📁 logs/
          📄 route.ts (TypeScript, 0.61KB)
      📁 auth/
        📁 callback/
        📁 register/
          📄 route.ts (TypeScript, 3.75KB)
      📁 fetch-all-repositories/
        📄 route.ts (TypeScript, 0.68KB)
      📁 git-providers/
        📁 [id]/
          📄 route.ts (TypeScript, 1.53KB)
        📁 callback/
          📄 route.ts (TypeScript, 1.43KB)
        📄 route.ts (TypeScript, 2.10KB)
      📁 health/
        📄 route.ts (TypeScript, 0.16KB)
      📁 hosts/
        📁 [id]/
          📄 route.ts (TypeScript, 1.14KB)
        📁 byname/
          📁 [name]/
            📄 route.ts (TypeScript, 2.35KB)
        📄 route.ts (TypeScript, 2.90KB)
        📁 test-all/
          📄 route.ts (TypeScript, 2.53KB)
        📁 test-connection/
          📄 route.ts (TypeScript, 2.86KB)
        📁 verify-fingerprint/
          📄 route.ts (TypeScript, 1.86KB)
      📁 projects/
        📁 [id]/
          📄 route.ts (TypeScript, 2.17KB)
        📄 route.ts (TypeScript, 4.29KB)
      📁 repositories/
        📁 [id]/
          📄 route.ts (TypeScript, 3.15KB)
        📄 route.ts (TypeScript, 1.56KB)
        📁 sync/
          📁 [id]/
            📄 route.ts (TypeScript, 0.80KB)
        📁 test-connection/
          📄 route.ts (TypeScript, 0.92KB)
          📄 schema.ts (TypeScript, 0.31KB)
      📁 terminals/
        📁 [id]/
          📄 route.ts (TypeScript, 2.70KB)
        📁 init/
          📄 route.ts (TypeScript, 1.26KB)
        📁 ws/
          📁 [id]/
            📄 route.ts (TypeScript, 0.95KB)
      📁 usecases/
        📄 route.ts (TypeScript, 2.78KB)
    📄 globals.css (CSS, 1.79KB)
    📄 layout.tsx (TypeScript, 1.27KB)
    📄 page.tsx (TypeScript, 0.20KB)
  📁 components/
    📁 dashboard/
      📄 Overview.tsx (TypeScript, 1.90KB)
      📄 RecentSales.tsx (TypeScript, 3.04KB)
    📁 dialog/
      📄 CommandMenu.tsx (TypeScript, 3.30KB)
      📄 ConfirmDialog.tsx (TypeScript, 1.64KB)
    📁 form/
      📄 PasswordInput.tsx (TypeScript, 1.50KB)
      📁 PinInput/
        📄 PinInput.common.tsx (TypeScript, 0.51KB)
        📄 PinInputField.tsx (TypeScript, 0.99KB)
        📄 context.tsx (TypeScript, 0.10KB)
        📄 index.tsx (TypeScript, 3.13KB)
        📄 types.ts (TypeScript, 2.31KB)
        📄 usePinInput.ts (TypeScript, 3.68KB)
        📄 utils.ts (TypeScript, 0.57KB)
      📄 PinInput.tsx (TypeScript, 9.13KB)
      📄 SelectDropdown.tsx (TypeScript, 1.61KB)
    📁 hosts/
      📄 HostDetail.tsx (TypeScript, 11.38KB)
    📁 icons/
      📄 ActivityLogIcon.tsx (TypeScript, 0.42KB)
      📄 index.tsx (TypeScript, 1.95KB)
    📁 layout/
      📄 AppSidebar.tsx (TypeScript, 3.21KB)
      📄 BaseHeader.tsx (TypeScript, 1.32KB)
      📄 EmptyState.tsx (TypeScript, 0.60KB)
      📄 Footer.tsx (TypeScript, 2.95KB)
      📄 Main.tsx (TypeScript, 0.48KB)
      📄 NavGroup.tsx (TypeScript, 5.20KB)
      📄 NavUser.tsx (TypeScript, 3.78KB)
      📄 PageHeader.tsx (TypeScript, 0.72KB)
      📄 RoleSwitcher.tsx (TypeScript, 3.22KB)
      📄 SiteHeader.tsx (TypeScript, 2.07KB)
      📄 TeamSwitcher.tsx (TypeScript, 3.37KB)
      📄 TopNav.tsx (TypeScript, 0.48KB)
      📄 UpgradePrompt.tsx (TypeScript, 1.04KB)
      📄 WorkspaceHeader.tsx (TypeScript, 4.40KB)
      📁 data/
        📄 sidebarData.ts (TypeScript, 3.24KB)
    📁 profile/
      📄 ProfileContent.tsx (TypeScript, 5.79KB)
      📄 ProfileDropdown.tsx (TypeScript, 3.32KB)
      📄 UserProfile.tsx (TypeScript, 3.95KB)
    📁 projects/
      📄 ProjectDetail.tsx (TypeScript, 5.79KB)
    📁 providers/
      📄 SWRProvider.tsx (TypeScript, 0.40KB)
      📄 ThemeProvider.tsx (TypeScript, 1.24KB)
      📄 index.ts (TypeScript, 0.09KB)
    📁 repositories/
      📄 RepositoryDetail.tsx (TypeScript, 9.80KB)
    📁 settings/
      📄 LanguageSettings.tsx (TypeScript, 1.95KB)
      📄 SettingsHeader.tsx (TypeScript, 0.77KB)
    📁 shadcn/
      📄 accordion.tsx (TypeScript, 1.91KB)
      📄 alert-dialog.tsx (TypeScript, 4.25KB)
      📄 alert.tsx (TypeScript, 1.67KB)
      📄 avatar.tsx (TypeScript, 1.40KB)
      📄 badge.tsx (TypeScript, 1.09KB)
      📄 button.tsx (TypeScript, 1.72KB)
      📄 card.tsx (TypeScript, 1.80KB)
      📄 checkbox.tsx (TypeScript, 1.04KB)
      📄 collapsible.tsx (TypeScript, 0.33KB)
      📄 command.tsx (TypeScript, 5.12KB)
      📄 dialog.tsx (TypeScript, 3.70KB)
      📄 dropdown-menu.tsx (TypeScript, 7.13KB)
      📄 form.tsx (TypeScript, 4.02KB)
      📄 input.tsx (TypeScript, 1.01KB)
      📄 label.tsx (TypeScript, 0.69KB)
      📄 language-switcher.tsx (TypeScript, 1.41KB)
      📄 pagination.tsx (TypeScript, 2.72KB)
      📄 popover.tsx (TypeScript, 1.06KB)
      📄 radio-group.tsx (TypeScript, 1.36KB)
      📄 scroll-area.tsx (TypeScript, 1.84KB)
      📄 search.tsx (TypeScript, 0.99KB)
      📄 select.tsx (TypeScript, 3.86KB)
      📄 separator.tsx (TypeScript, 0.71KB)
      📄 sheet.tsx (TypeScript, 4.13KB)
      📄 sidebar.tsx (TypeScript, 23.50KB)
      📄 skeleton.tsx (TypeScript, 0.23KB)
      📄 switch.tsx (TypeScript, 1.13KB)
      📄 table.tsx (TypeScript, 2.67KB)
      📄 tabs.tsx (TypeScript, 1.87KB)
      📄 textarea.tsx (TypeScript, 0.96KB)
      📄 theme-toggle.tsx (TypeScript, 3.63KB)
      📄 toaster.tsx (TypeScript, 0.15KB)
      📄 tooltip.tsx (TypeScript, 1.04KB)
      📄 use-toast.ts (TypeScript, 0.48KB)
    📁 sidebar/
      📄 Sidebar.tsx (TypeScript, 3.73KB)
      📄 SidebarContent.tsx (TypeScript, 0.51KB)
      📄 SidebarFooter.tsx (TypeScript, 0.44KB)
      📄 SidebarGroup.tsx (TypeScript, 0.42KB)
      📄 SidebarGroupAction.tsx (TypeScript, 0.92KB)
      📄 SidebarGroupContent.tsx (TypeScript, 0.42KB)
      📄 SidebarGroupLabel.tsx (TypeScript, 0.84KB)
      📄 SidebarHeader.tsx (TypeScript, 0.44KB)
      📄 SidebarInput.tsx (TypeScript, 0.55KB)
      📄 SidebarInset.tsx (TypeScript, 0.71KB)
      📄 SidebarMenu.tsx (TypeScript, 0.38KB)
      📄 SidebarMenuAction.tsx (TypeScript, 0.00KB)
      📄 SidebarMenuButton.tsx (TypeScript, 3.02KB)
      📄 SidebarMenuItem.tsx (TypeScript, 0.42KB)
      📄 SidebarMenuSub.tsx (TypeScript, 0.43KB)
      📄 SidebarMenuSubButton.tsx (TypeScript, 3.03KB)
      📄 SidebarRail.tsx (TypeScript, 1.41KB)
      📄 SidebarSeparator.tsx (TypeScript, 0.45KB)
      📄 SidebarTrigger.tsx (TypeScript, 0.81KB)
      📄 constants.ts (TypeScript, 0.47KB)
      📄 index.tsx (TypeScript, 1.02KB)
      📄 sidebarData.ts (TypeScript, 0.08KB)
    📁 theme/
      📄 ThemeProvider.tsx (TypeScript, 1.41KB)
      📄 ThemeSwitch.tsx (TypeScript, 1.91KB)
    📁 ui/
      📄 LoadingSpinner.tsx (TypeScript, 0.48KB)
      📄 LongText.tsx (TypeScript, 1.98KB)
      📄 Search.tsx (TypeScript, 1.16KB)
  📁 config/
    📄 fonts.ts (TypeScript, 1.04KB)
  📄 config.ts (TypeScript, 0.94KB)
  📁 context/
    📄 FontContext.tsx (TypeScript, 1.20KB)
    📄 SearchContext.tsx (TypeScript, 1.02KB)
    📄 SidebarContext.tsx (TypeScript, 2.70KB)
    📄 ThemeContext.tsx (TypeScript, 2.19KB)
    📄 UserContext.tsx (TypeScript, 5.12KB)
  📁 hooks/
    📄 useDialogState.tsx (TypeScript, 0.53KB)
    📄 useGitProviders.ts (TypeScript, 3.71KB)
    📄 useHost.ts (TypeScript, 5.84KB)
    📄 useHosts.ts (TypeScript, 10.73KB)
    📄 useMobile.tsx (TypeScript, 0.58KB)
    📄 useProject.ts (TypeScript, 4.27KB)
    📄 useProjects.ts (TypeScript, 5.58KB)
    📄 useRepositories.ts (TypeScript, 6.54KB)
    📄 useRepository.ts (TypeScript, 5.67KB)
    📄 useSidebar.ts (TypeScript, 1.40KB)
    📄 useUser.ts (TypeScript, 0.27KB)
  📁 i18n/
    📄 index.ts (TypeScript, 0.21KB)
    📁 messages/
      📄 en.json (JSON Configuration, 9.86KB)
      📄 fr.json (JSON Configuration, 10.71KB)
    📄 request.ts (TypeScript, 0.46KB)
  📁 lib/
    📁 api/
    📄 cache.ts (TypeScript, 2.30KB)
    📄 chart.ts (TypeScript, 0.34KB)
    📄 env.ts (TypeScript, 3.26KB)
    📄 features.ts (TypeScript, 2.37KB)
    📄 logger.ts (TypeScript, 1.39KB)
    📁 services/
      📁 git-providers/
        📄 gitea.ts (TypeScript, 3.97KB)
        📄 github.ts (TypeScript, 7.06KB)
        📄 gitlab.ts (TypeScript, 8.18KB)
      📄 hosts.ts (TypeScript, 12.21KB)
      📄 http.ts (TypeScript, 11.79KB)
      📄 index.ts (TypeScript, 0.22KB)
      📄 oauth.ts (TypeScript, 2.02KB)
      📄 repositories.ts (TypeScript, 8.09KB)
      📄 ssh.ts (TypeScript, 13.88KB)
      📄 terminal.ts (TypeScript, 6.53KB)
      📄 websocket.ts (TypeScript, 9.68KB)
    📁 supabase/
      📄 admin.ts (TypeScript, 1.09KB)
      📄 auth.ts (TypeScript, 13.80KB)
      📄 client.ts (TypeScript, 0.92KB)
      📄 db.ts (TypeScript, 15.15KB)
      📄 index.ts (TypeScript, 0.53KB)
      📄 middleware.ts (TypeScript, 4.68KB)
      📄 server.ts (TypeScript, 1.03KB)
    📄 utils.ts (TypeScript, 0.66KB)
  📄 middleware.ts (TypeScript, 5.21KB)
  📁 types/
    📄 environment.d.ts (TypeScript, 0.52KB)
    📄 features.ts (TypeScript, 0.35KB)
    📄 git-providers.ts (TypeScript, 1.67KB)
    📄 hosts.ts (TypeScript, 0.63KB)
    📄 logger.ts (TypeScript, 0.75KB)
    📄 repositories.ts (TypeScript, 2.44KB)
    📄 scripts.ts (TypeScript, 0.85KB)
    📄 sidebar.ts (TypeScript, 0.56KB)
    📄 ssh.ts (TypeScript, 0.60KB)
    📄 supabase.ts (TypeScript, 11.90KB)
    📄 usecase.ts (TypeScript, 0.45KB)
    📄 user.ts (TypeScript, 3.46KB)
  📁 utils/
    📄 electronApi.ts (TypeScript, 2.33KB)
    📄 isElectron.ts (TypeScript, 0.25KB)
📁 supabase/
  📁 .branches/
    📄 _current_branch (Other, 0.00KB)
  📄 .gitignore (Other, 0.07KB)
  📁 .temp/
    📄 cli-latest (Other, 0.01KB)
    📄 gotrue-version (Other, 0.01KB)
    📄 pooler-url (Other, 0.11KB)
    📄 postgres-version (Other, 0.01KB)
    📄 project-ref (Other, 0.02KB)
    📄 rest-version (Other, 0.01KB)
    📄 storage-version (Other, 0.01KB)
  📄 config.toml (Other, 6.41KB)
  📁 migrations/
    📁 20250305235420_initial_schema/
    📄 20250306000000_convert_to_snake_case.sql (Other, 5.09KB)
📄 tailwind.config.js (JavaScript, 2.35KB)
📁 tests/
  📄 e2e.test.ts (TypeScript, 0.63KB)
  📄 setup.ts (TypeScript, 1.74KB)
📄 tsconfig.json (JSON Configuration, 0.82KB)
```

## Project Details

- **Name:** automai
- **Version:** 0.2.0
- **Description:** Automai is a multi-tenant SaaS platform designed for end-to-end test automation across web, desktop, and mobile environments.

### Dependencies

- `@alloc/quick-lru`: 5.2.0
- `@hookform/resolvers`: 4.1.3
- `@monaco-editor/react`: ^4.7.0
- `@radix-ui/react-accordion`: ^1.2.3
- `@radix-ui/react-alert-dialog`: ^1.1.6
- `@radix-ui/react-avatar`: ^1.1.3
- `@radix-ui/react-checkbox`: ^1.1.4
- `@radix-ui/react-collapsible`: ^1.1.3
- `@radix-ui/react-dialog`: ^1.1.6
- `@radix-ui/react-dropdown-menu`: ^2.1.6
- `@radix-ui/react-label`: ^2.1.2
- `@radix-ui/react-popover`: ^1.1.6
- `@radix-ui/react-radio-group`: ^1.2.3
- `@radix-ui/react-scroll-area`: ^1.2.3
- `@radix-ui/react-select`: ^2.1.6
- `@radix-ui/react-separator`: ^1.1.2
- `@radix-ui/react-slot`: ^1.1.2
- `@radix-ui/react-switch`: ^1.1.3
- `@radix-ui/react-tabs`: ^1.1.3
- `@radix-ui/react-toast`: ^1.2.6
- `@radix-ui/react-tooltip`: ^1.1.8
- `@radix-ui/react-visually-hidden`: ^1.1.2
- `@supabase/ssr`: 0.5.2
- `@supabase/supabase-js`: 2.49.1
- `@t3-oss/env-nextjs`: 0.12.0
- `@tabler/icons-react`: ^3.30.0
- `@tanstack/react-query`: 5.67.1
- `@tanstack/react-table`: 8.21.2
- `@types/bcrypt`: ^5.0.2
- `@types/js-cookie`: ^3.0.6
- `@types/jsonwebtoken`: ^9.0.9
- `@xterm/addon-attach`: ^0.12.0-beta.98
- `@xterm/addon-fit`: ^0.11.0-beta.98
- `@xterm/addon-search`: ^0.16.0-beta.98
- `@xterm/addon-web-links`: ^0.12.0-beta.98
- `@xterm/xterm`: ^5.6.0-beta.98
- `asn1`: 0.2.6
- `bcrypt`: ^5.1.1
- `chart.js`: 4.4.8
- `clsx`: 2.1.1
- `cmdk`: ^1.0.4
- `crypto-browserify`: ^3.12.1
- `date-fns`: 4.1.0
- `electron-store`: ^10.0.1
- `get-nonce`: 1.0.1
- `is-electron`: ^2.2.2
- `js-cookie`: ^3.0.5
- `jsonwebtoken`: ^9.0.2
- `next`: ^15.2.1
- `next-intl`: 3.26.5
- `nopt`: 8.1.0
- `react`: latest
- `react-chartjs-2`: 5.3.0
- `react-dom`: latest
- `react-hotkeys-hook`: 4.6.1
- `simple-git`: ^3.27.0
- `sonner`: 2.0.1
- `ssh2`: ^1.16.0
- `stream-browserify`: ^3.0.0
- `supabase`: ^2.15.8
- `swr`: ^2.3.3
- `tailwind-merge`: 3.0.2
- `tailwindcss`: 3.4.1
- `ts-node`: ^10.9.2
- `use-callback-ref`: 1.3.3
- `ws`: ^8.18.1
- `zod`: 3.24.2

### Dev Dependencies

- `@eslint/eslintrc`: ^3.3.0
- `@eslint/js`: ^9.21.0
- `@humanwhocodes/module-importer`: ^1.0.1
- `@next/bundle-analyzer`: ^15.2.1
- `@tanstack/react-router`: ^1.112.11
- `@types/jest`: 29.5.14
- `@types/node`: ^22.13.9
- `@types/react`: latest
- `@types/react-dom`: latest
- `@types/ssh2`: ^1.15.4
- `@types/verror`: ^1.10.11
- `@types/ws`: 8.5.14
- `@typescript-eslint/eslint-plugin`: ^8.26.0
- `@typescript-eslint/parser`: ^8.26.0
- `autoprefixer`: 10.4.21
- `class-variance-authority`: 0.7.1
- `cross-env`: ^7.0.3
- `dotenv`: 16.4.7
- `electron`: ^35.0.0
- `electron-builder`: ^25.1.8
- `eslint`: ^9.21.0
- `eslint-config-next`: ^15.2.1
- `eslint-config-prettier`: ^10.0.2
- `eslint-import-resolver-typescript`: ^3.8.3
- `eslint-plugin-import`: ^2.31.0
- `eslint-plugin-jsx-a11y`: 6.10.2
- `eslint-plugin-prettier`: ^5.2.3
- `eslint-plugin-react`: 7.37.4
- `eslint-plugin-react-hooks`: 5.2.0
- `eslint-plugin-react-refresh`: ^0.4.19
- `eslint-plugin-unused-imports`: 4.1.4
- `glob`: ^11.0.1
- `jest`: ^29.7.0
- `lru-cache`: ^11.0.2
- `lucide-react`: 0.477.0
- `next-themes`: 0.4.4
- `postcss`: ^8.5.3
- `prettier`: ^3.5.3
- `puppeteer`: ^24.3.1
- `react-hook-form`: ^7.54.2
- `rimraf`: ^6.0.1
- `tailwindcss-animate`: 1.0.7
- `ts-jest`: ^29.2.6
- `typescript`: ^5.8.2
