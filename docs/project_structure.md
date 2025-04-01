- **name:** automai
- **version:** 3.2.0
- **description:** automai is a multi-tenant saas platform designed for end-to-end test automation across web, desktop, and mobile environments.
```bash
node scripts/generate-structure.js
```

# automai project structure

generated on: 4/1/2025, 7:20:27 AM

## usage

to generate this documentation, run:

```bash
# from the project root directory
node scripts/generate-structure.js
```

this will create a new file at `docs/project_structure.md` containing the current project structure.

## project statistics

### overall statistics
- total files: 397
- total lines: 0

### statistics by file type
#### typescript
- files: 392
- lines: 0
- average lines per file: 0.00

#### css
- files: 1
- lines: 0
- average lines per file: 0.00

#### json configuration
- files: 2
- lines: 0
- average lines per file: 0.00

#### documentation
- files: 2
- lines: 0
- average lines per file: 0.00


## directory structure

```
📁 app/
  📁 [locale]/
    📁 (auth)/
      📁 auth-redirect/
        📄 page.tsx (typescript, 0 lines)
      📁 forgot-password/
        📄 page.tsx (typescript, 0 lines)
      📁 login/
        📄 page.tsx (typescript, 0 lines)
      📁 reset-password/
        📄 page.tsx (typescript, 0 lines)
      📁 signup/
        📄 page.tsx (typescript, 0 lines)
      📄 layout.tsx (typescript, 0 lines)
    📁 (marketing)/
      📁 _components/
        📄 comingsoon.tsx (typescript, 0 lines)
        📄 features.tsx (typescript, 0 lines)
        📄 hero.tsx (typescript, 0 lines)
        📄 index.ts (typescript, 0 lines)
      📄 layout.tsx (typescript, 0 lines)
    📁 [tenant]/
      📁 _components/
        📁 client/
          📄 tenantlayoutclient.tsx (typescript, 0 lines)
      📁 billing/
        📁 _components/
          📁 client/
            📄 billingactions.tsx (typescript, 0 lines)
          📄 billingcontent.tsx (typescript, 0 lines)
          📄 billingskeleton.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 cicd/
        📁 _components/
          📁 client/
            📄 cicdactionsclient.tsx (typescript, 0 lines)
            📄 cicddetailsclient.tsx (typescript, 0 lines)
          📄 cicdcontent.tsx (typescript, 0 lines)
          📄 cicdform.tsx (typescript, 0 lines)
          📄 cicdskeleton.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
        📄 constants.ts (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 dashboard/
        📁 _components/
          📁 client/
            📄 dashboardheaderclient.tsx (typescript, 0 lines)
            📄 dashboardmaincontentclient.tsx (typescript, 0 lines)
            📄 dashboardoverviewclient.tsx (typescript, 0 lines)
            📄 dashboardrecentsalesclient.tsx (typescript, 0 lines)
            📄 dashboardstatscardsclient.tsx (typescript, 0 lines)
            📄 dashboardtabcontentcardclient.tsx (typescript, 0 lines)
            📄 dashboardtabsclient.tsx (typescript, 0 lines)
          📄 dashboardmaincontent.tsx (typescript, 0 lines)
          📄 dashboardoverview.tsx (typescript, 0 lines)
          📄 dashboardrecentsales.tsx (typescript, 0 lines)
          📄 dashboardstatscards.tsx (typescript, 0 lines)
          📄 dashboardtabcontentcard.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 deployment/
        📁 _components/
          📁 client/
            📄 clientdeploymentdetails.tsx (typescript, 0 lines)
            📄 clientdeploymentrunaction.tsx (typescript, 0 lines)
            📄 clientdeploymentwizard.tsx (typescript, 0 lines)
            📄 clientemptystate.tsx (typescript, 0 lines)
            📄 deploymentactions.tsx (typescript, 0 lines)
            📄 deploymentdetailsclient.tsx (typescript, 0 lines)
            📄 deploymentemptystateclient.tsx (typescript, 0 lines)
            📄 deploymentrunactionclient.tsx (typescript, 0 lines)
            📄 deploymentwizard.tsx (typescript, 0 lines)
            📄 deploymentwizardclient.tsx (typescript, 0 lines)
            📄 deploymentwizardstep5.tsx (typescript, 0 lines)
            📄 index.ts (typescript, 0 lines)
          📄 customswitch.tsx (typescript, 0 lines)
          📄 deploymentactions.tsx (typescript, 0 lines)
          📄 deploymentactionsclient.tsx (typescript, 0 lines)
          📄 deploymentcontent.tsx (typescript, 0 lines)
          📄 deploymenthostselector.tsx (typescript, 0 lines)
          📄 deploymentlist.tsx (typescript, 0 lines)
          📄 deploymentnavbar.tsx (typescript, 0 lines)
          📄 deploymentscriptselectorenhanced.tsx (typescript, 0 lines)
          📄 deploymentskeleton.tsx (typescript, 0 lines)
          📄 deploymentwizardcontainer.tsx (typescript, 0 lines)
          📄 deploymentwizardstep1.tsx (typescript, 0 lines)
          📄 deploymentwizardstep2.tsx (typescript, 0 lines)
          📄 deploymentwizardstep3.tsx (typescript, 0 lines)
          📄 deploymentwizardstep4.tsx (typescript, 0 lines)
          📄 enhancedscriptselector.tsx (typescript, 0 lines)
          📄 hostselector.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
          📄 scriptselector.tsx (typescript, 0 lines)
          📄 statusbadge.tsx (typescript, 0 lines)
        📄 constants.ts (typescript, 0 lines)
        📄 deploymentlist.tsx (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 devices/
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 hosts/
        📁 _components/
          📁 client/
            📄 clientconnectionform.tsx (typescript, 0 lines)
            📄 clienthostlist.tsx (typescript, 0 lines)
            📄 connectionformclient.tsx (typescript, 0 lines)
            📄 constants.ts (typescript, 0 lines)
            📄 hostactions.tsx (typescript, 0 lines)
            📄 hostlistclient.tsx (typescript, 0 lines)
            📄 index.ts (typescript, 0 lines)
          📄 connecthostdialog.tsx (typescript, 0 lines)
          📄 hostactions.tsx (typescript, 0 lines)
          📄 hostactionsclient.tsx (typescript, 0 lines)
          📄 hostcard.tsx (typescript, 0 lines)
          📄 hostcontent.tsx (typescript, 0 lines)
          📄 hostgrid.tsx (typescript, 0 lines)
          📄 hostoverview.tsx (typescript, 0 lines)
          📄 hostsettings.tsx (typescript, 0 lines)
          📄 hostskeleton.tsx (typescript, 0 lines)
          📄 hosttable.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
          📄 statussummary.tsx (typescript, 0 lines)
        📁 terminals/
          📁 _components/
            📁 client/
              📄 clientterminal.tsx (typescript, 0 lines)
              📄 index.ts (typescript, 0 lines)
            📄 index.ts (typescript, 0 lines)
            📄 terminalcontainer.tsx (typescript, 0 lines)
            📄 terminalskeleton.tsx (typescript, 0 lines)
          📄 page.tsx (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 profile/
        📁 _components/
          📁 client/
            📄 profilecontent.tsx (typescript, 0 lines)
            📄 profilecontentclient.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
          📄 profilecontent.tsx (typescript, 0 lines)
          📄 profileskeleton.tsx (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 reports/
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 repositories/
        📁 _components/
          📁 client/
            📄 clientrepositorylist.tsx (typescript, 0 lines)
            📄 index.ts (typescript, 0 lines)
            📄 repositoryactions.tsx (typescript, 0 lines)
            📄 repositorylistclient.tsx (typescript, 0 lines)
          📄 enhancedconnectrepositorydialog.tsx (typescript, 0 lines)
          📄 enhancedrepositorycard.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
          📄 repositoryactions.tsx (typescript, 0 lines)
          📄 repositoryactionsclient.tsx (typescript, 0 lines)
          📄 repositorycardenhanced.tsx (typescript, 0 lines)
          📄 repositoryconnectdialogenhanced.tsx (typescript, 0 lines)
          📄 repositorycontent.tsx (typescript, 0 lines)
          📄 repositorydetailview.tsx (typescript, 0 lines)
          📄 repositorydialogs.tsx (typescript, 0 lines)
          📄 repositoryexplorer.tsx (typescript, 0 lines)
          📄 repositoryheader.tsx (typescript, 0 lines)
          📄 repositorylist.tsx (typescript, 0 lines)
          📄 repositoryskeleton.tsx (typescript, 0 lines)
        📄 constants.ts (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 settings/
        📁 _components/
          📁 client/
            📄 index.ts (typescript, 0 lines)
            📄 settingscontent.tsx (typescript, 0 lines)
            📄 settingscontentclient.tsx (typescript, 0 lines)
          📄 index.ts (typescript, 0 lines)
          📄 settingscontent.tsx (typescript, 0 lines)
          📄 settingsskeleton.tsx (typescript, 0 lines)
        📁 profile/
          📄 page.tsx (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📁 team/
        📁 _components/
          📁 client/
            📄 teamactionsclient.tsx (typescript, 0 lines)
            📄 teammemberadddialogclient.tsx (typescript, 0 lines)
            📄 teammemberdialogclient.tsx (typescript, 0 lines)
            📄 teammembermanagerclient.tsx (typescript, 0 lines)
            📄 teammemberpermissionsdialogclient.tsx (typescript, 0 lines)
            📄 teammemberstabclient.tsx (typescript, 0 lines)
            📄 teamresourcesunassignedclient.tsx (typescript, 0 lines)
            📄 teamtabsclient.tsx (typescript, 0 lines)
          📄 teamheader.tsx (typescript, 0 lines)
          📄 teammemberstableskeleton.tsx (typescript, 0 lines)
          📄 teamoverview.tsx (typescript, 0 lines)
          📄 teamoverviewskeleton.tsx (typescript, 0 lines)
          📄 teamskeleton.tsx (typescript, 0 lines)
        📄 metadata.ts (typescript, 0 lines)
        📄 page.tsx (typescript, 0 lines)
      📄 layout.tsx (typescript, 0 lines)
      📄 metadata.ts (typescript, 0 lines)
      📄 page.tsx (typescript, 0 lines)
    📄 layout.tsx (typescript, 0 lines)
    📄 page.tsx (typescript, 0 lines)
  📁 actions/
    📄 auth.ts (typescript, 0 lines)
    📄 cicd.ts (typescript, 0 lines)
    📄 dashboard.ts (typescript, 0 lines)
    📄 deployments.ts (typescript, 0 lines)
    📄 deploymentwizard.ts (typescript, 0 lines)
    📄 hosts.ts (typescript, 0 lines)
    📄 index.ts (typescript, 0 lines)
    📄 permission.ts (typescript, 0 lines)
    📄 repositories.ts (typescript, 0 lines)
    📄 session.ts (typescript, 0 lines)
    📄 sidebar.ts (typescript, 0 lines)
    📄 team.ts (typescript, 0 lines)
    📄 teammember.ts (typescript, 0 lines)
    📄 terminals.ts (typescript, 0 lines)
    📄 user.ts (typescript, 0 lines)
  📁 api/
    📁 deployments/
      📁 [id]/
    📁 git-providers/
      📁 [id]/
      📁 callback/
    📁 repositories/
      📁 explore/
      📁 sync/
        📁 [id]/
      📁 test-connection/
        📄 schema.ts (typescript, 0 lines)
      📁 verify/
        📄 schema.ts (typescript, 0 lines)
      📄 route.ts (typescript, 0 lines)
    📁 terminals/
      📁 [id]/
      📁 init/
        📄 route.ts (typescript, 0 lines)
      📁 ws/
        📁 [id]/
  📁 providers/
    📄 index.tsx (typescript, 0 lines)
    📄 sidebar.tsx (typescript, 0 lines)
    📄 swr.tsx (typescript, 0 lines)
    📄 team.tsx (typescript, 0 lines)
    📄 theme.tsx (typescript, 0 lines)
    📄 toast.tsx (typescript, 0 lines)
    📄 user.tsx (typescript, 0 lines)
  📄 globals.css (css, 0 lines)
  📄 layout.tsx (typescript, 0 lines)
  📄 metadata.ts (typescript, 0 lines)
  📄 page.tsx (typescript, 0 lines)
📁 components/
  📁 dialog/
    📄 commandmenu.tsx (typescript, 0 lines)
    📄 confirmdialog.tsx (typescript, 0 lines)
  📁 icons/
    📄 activitylogicon.tsx (typescript, 0 lines)
    📄 index.tsx (typescript, 0 lines)
  📁 layout/
    📁 client/
      📄 index.ts (typescript, 0 lines)
      📄 teamswitcherclient.tsx (typescript, 0 lines)
      📄 userprofiledropdown.tsx (typescript, 0 lines)
    📄 appsidebar.tsx (typescript, 0 lines)
    📄 appsidebarskeleton.tsx (typescript, 0 lines)
    📄 baseheader.tsx (typescript, 0 lines)
    📄 emptystate.tsx (typescript, 0 lines)
    📄 featurepagecontainer.tsx (typescript, 0 lines)
    📄 footer.tsx (typescript, 0 lines)
    📄 main.tsx (typescript, 0 lines)
    📄 navgroup.tsx (typescript, 0 lines)
    📄 navuser.tsx (typescript, 0 lines)
    📄 pageheader.tsx (typescript, 0 lines)
    📄 roleswitcher.tsx (typescript, 0 lines)
    📄 siteheader.tsx (typescript, 0 lines)
    📄 teamswitcher.tsx (typescript, 0 lines)
    📄 upgradeprompt.tsx (typescript, 0 lines)
    📄 userprofiledropdownclient.tsx (typescript, 0 lines)
    📄 workspaceheader.tsx (typescript, 0 lines)
    📄 workspaceheaderskeleton.tsx (typescript, 0 lines)
  📁 profile/
    📄 profilecontent.tsx (typescript, 0 lines)
    📄 profiledropdown.tsx (typescript, 0 lines)
    📄 userprofile.tsx (typescript, 0 lines)
  📁 settings/
    📄 languagesettings.tsx (typescript, 0 lines)
  📁 shadcn/
    📄 accordion.tsx (typescript, 0 lines)
    📄 alert-dialog.tsx (typescript, 0 lines)
    📄 alert.tsx (typescript, 0 lines)
    📄 avatar.tsx (typescript, 0 lines)
    📄 badge.tsx (typescript, 0 lines)
    📄 breadcrumb.tsx (typescript, 0 lines)
    📄 button.tsx (typescript, 0 lines)
    📄 card.tsx (typescript, 0 lines)
    📄 checkbox.tsx (typescript, 0 lines)
    📄 collapsible.tsx (typescript, 0 lines)
    📄 command.tsx (typescript, 0 lines)
    📄 dialog.tsx (typescript, 0 lines)
    📄 dropdown-menu.tsx (typescript, 0 lines)
    📄 form.tsx (typescript, 0 lines)
    📄 input.tsx (typescript, 0 lines)
    📄 label.tsx (typescript, 0 lines)
    📄 language-switcher.tsx (typescript, 0 lines)
    📄 pagination.tsx (typescript, 0 lines)
    📄 popover.tsx (typescript, 0 lines)
    📄 radio-group.tsx (typescript, 0 lines)
    📄 scroll-area.tsx (typescript, 0 lines)
    📄 search.tsx (typescript, 0 lines)
    📄 select.tsx (typescript, 0 lines)
    📄 separator.tsx (typescript, 0 lines)
    📄 sheet.tsx (typescript, 0 lines)
    📄 sidebar.tsx (typescript, 0 lines)
    📄 skeleton.tsx (typescript, 0 lines)
    📄 switch.tsx (typescript, 0 lines)
    📄 table.tsx (typescript, 0 lines)
    📄 tabs.tsx (typescript, 0 lines)
    📄 textarea.tsx (typescript, 0 lines)
    📄 theme-toggle.tsx (typescript, 0 lines)
    📄 tooltip.tsx (typescript, 0 lines)
    📄 use-toast.ts (typescript, 0 lines)
  📁 sidebar/
    📄 constants.ts (typescript, 0 lines)
    📄 index.tsx (typescript, 0 lines)
    📄 sidebar.tsx (typescript, 0 lines)
    📄 sidebarclient.tsx (typescript, 0 lines)
    📄 sidebardata.ts (typescript, 0 lines)
    📄 sidebargroups.tsx (typescript, 0 lines)
    📄 sidebarinput.tsx (typescript, 0 lines)
    📄 sidebarlayout.tsx (typescript, 0 lines)
    📄 sidebarmenubutton.tsx (typescript, 0 lines)
    📄 sidebarmenuitems.tsx (typescript, 0 lines)
    📄 sidebarmenusubbutton.tsx (typescript, 0 lines)
    📄 sidebarrail.tsx (typescript, 0 lines)
    📄 sidebartrigger.tsx (typescript, 0 lines)
  📁 team/
    📄 creatorbadge.tsx (typescript, 0 lines)
    📄 permissionawareactions.tsx (typescript, 0 lines)
    📄 permissionawareactionswrapper.tsx (typescript, 0 lines)
    📄 teamselector.tsx (typescript, 0 lines)
    📄 teamselectorclient.tsx (typescript, 0 lines)
    📄 teamswitcher.tsx (typescript, 0 lines)
    📄 teamswitcherclient.tsx (typescript, 0 lines)
  📁 theme/
    📄 themeprovider.tsx (typescript, 0 lines)
    📄 themeswitch.tsx (typescript, 0 lines)
    📄 themetogglestatic.tsx (typescript, 0 lines)
  📁 ui/
    📄 breadcrumb.tsx (typescript, 0 lines)
    📄 loadingspinner.tsx (typescript, 0 lines)
    📄 longtext.tsx (typescript, 0 lines)
    📄 permissionguard.tsx (typescript, 0 lines)
    📄 progress.tsx (typescript, 0 lines)
    📄 resource-card.tsx (typescript, 0 lines)
    📄 search.tsx (typescript, 0 lines)
  📁 workspace/
    📄 workspaceheader.tsx (typescript, 0 lines)
    📄 workspaceheaderclient.tsx (typescript, 0 lines)
    📄 workspaceheaderskeleton.tsx (typescript, 0 lines)
📁 config/
  📄 fonts.ts (typescript, 0 lines)
📁 context/
  📄 fontcontext.tsx (typescript, 0 lines)
  📄 index.ts (typescript, 0 lines)
  📄 permissioncontext.tsx (typescript, 0 lines)
  📄 searchcontext.tsx (typescript, 0 lines)
  📄 sidebarcontext.tsx (typescript, 0 lines)
  📄 teamcontext.tsx (typescript, 0 lines)
  📄 themecontext.tsx (typescript, 0 lines)
  📄 usercontext.tsx (typescript, 0 lines)
📁 hooks/
  📁 permission/
    📄 index.ts (typescript, 0 lines)
    📄 usepermission.ts (typescript, 0 lines)
  📁 team/
    📄 index.ts (typescript, 0 lines)
    📄 useteamresources.ts (typescript, 0 lines)
  📁 teammember/
    📄 index.ts (typescript, 0 lines)
    📄 useteammembermanagement.ts (typescript, 0 lines)
    📄 useteammembers.ts (typescript, 0 lines)
  📄 index.ts (typescript, 0 lines)
  📄 usemobile.tsx (typescript, 0 lines)
  📄 userequestprotection.ts (typescript, 0 lines)
📁 i18n/
  📁 messages/
    📄 en.json (json configuration, 0 lines)
    📄 fr.json (json configuration, 0 lines)
  📄 index.ts (typescript, 0 lines)
  📄 request.ts (typescript, 0 lines)
📁 lib/
  📁 gitea-api/
    📄 index.ts (typescript, 0 lines)
  📁 github-api/
    📄 index.ts (typescript, 0 lines)
  📁 gitlab-api/
    📄 index.ts (typescript, 0 lines)
  📁 services/
    📁 cicd/
      📄 factory.ts (typescript, 0 lines)
      📄 github.ts (typescript, 0 lines)
      📄 index.ts (typescript, 0 lines)
      📄 interfaces.ts (typescript, 0 lines)
      📄 jenkins.ts (typescript, 0 lines)
    📄 hosts.ts (typescript, 0 lines)
    📄 http.ts (typescript, 0 lines)
    📄 index.ts (typescript, 0 lines)
    📄 oauth.ts (typescript, 0 lines)
    📄 ssh.ts (typescript, 0 lines)
    📄 terminal.ts (typescript, 0 lines)
    📄 websocket.ts (typescript, 0 lines)
  📁 supabase/
    📁 db-cicd/
      📄 cicd.ts (typescript, 0 lines)
      📄 index.ts (typescript, 0 lines)
    📁 db-deployment/
      📄 deployment.ts (typescript, 0 lines)
      📄 index.ts (typescript, 0 lines)
    📁 db-hosts/
      📄 host.ts (typescript, 0 lines)
      📄 index.ts (typescript, 0 lines)
    📁 db-repositories/
      📄 db-git-provider.ts (typescript, 0 lines)
      📄 db-repository.ts (typescript, 0 lines)
      📄 index.ts (typescript, 0 lines)
      📄 utils.ts (typescript, 0 lines)
    📁 db-teams/
      📄 index.ts (typescript, 0 lines)
      📄 permissions.ts (typescript, 0 lines)
      📄 resource-limits.ts (typescript, 0 lines)
      📄 team-members.ts (typescript, 0 lines)
      📄 teams.ts (typescript, 0 lines)
    📁 db-users/
      📄 index.ts (typescript, 0 lines)
      📄 user.ts (typescript, 0 lines)
    📄 admin.ts (typescript, 0 lines)
    📄 auth.ts (typescript, 0 lines)
    📄 client.ts (typescript, 0 lines)
    📄 db.ts (typescript, 0 lines)
    📄 index.ts (typescript, 0 lines)
    📄 middleware.ts (typescript, 0 lines)
    📄 server.ts (typescript, 0 lines)
  📄 cache.ts (typescript, 0 lines)
  📄 chart.ts (typescript, 0 lines)
  📄 env.ts (typescript, 0 lines)
  📄 features.ts (typescript, 0 lines)
  📄 fetcher.ts (typescript, 0 lines)
  📄 logger.ts (typescript, 0 lines)
  📄 session.ts (typescript, 0 lines)
  📄 utils.ts (typescript, 0 lines)
📁 pages/
  📄 _document.tsx (typescript, 0 lines)
📁 types/
  📁 api/
    📁 git/
      📄 common.ts (typescript, 0 lines)
      📄 github.ts (typescript, 0 lines)
      📄 gitlab.ts (typescript, 0 lines)
  📁 auth/
    📄 session.ts (typescript, 0 lines)
    📄 user.ts (typescript, 0 lines)
  📁 context/
    📄 app.ts (typescript, 0 lines)
    📄 cicd.ts (typescript, 0 lines)
    📄 constants.ts (typescript, 0 lines)
    📄 dashboard.ts (typescript, 0 lines)
    📄 deployment.ts (typescript, 0 lines)
    📄 host.ts (typescript, 0 lines)
    📄 permissions.ts (typescript, 0 lines)
    📄 repository.ts (typescript, 0 lines)
    📄 team.ts (typescript, 0 lines)
    📄 user.ts (typescript, 0 lines)
  📁 core/
    📄 deployment.ts (typescript, 0 lines)
    📄 host.ts (typescript, 0 lines)
    📄 ssh.ts (typescript, 0 lines)
  📁 db/
    📄 supabase.ts (typescript, 0 lines)
  📄 environment.d.ts (typescript, 0 lines)
  📄 features.ts (typescript, 0 lines)
  📄 index.ts (typescript, 0 lines)
  📄 readme.md (documentation, 0 lines)
  📄 scripts.ts (typescript, 0 lines)
  📄 sidebar.ts (typescript, 0 lines)
  📄 ssh.ts (typescript, 0 lines)
  📄 supabase.ts (typescript, 0 lines)
  📄 user.ts (typescript, 0 lines)
📁 utils/
  📄 contexthelpers.ts (typescript, 0 lines)
  📄 createsafecontext.ts (typescript, 0 lines)
  📄 deployment.ts (typescript, 0 lines)
  📄 electronapi.ts (typescript, 0 lines)
  📄 iselectron.ts (typescript, 0 lines)
  📄 loopprotectedcontext.md (documentation, 0 lines)
📄 config.ts (typescript, 0 lines)
📄 middleware.ts (typescript, 0 lines)
```

