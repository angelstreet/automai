- **name:** automai
- **version:** 0.2.0
- **description:** automai is a multi-tenant saas platform designed for end-to-end test automation across web, desktop, and mobile environments.
```bash
node scripts/generate-structure.js
```

# automai3 project structure

generated on: 3/23/2025, 2:46:13 PM

## usage

to generate this documentation, run:

```bash
# from the project root directory
node scripts/generate-structure.js
```

this will create a new file at `docs/project_structure.md` containing the current project structure.

## project statistics

### overall statistics
- total files: 0
- total lines: 0

### statistics by file type
## directory structure

```
📁 app/
  📁 [locale]/
    📁 (auth)/
      📁 auth-redirect/
        📄 page.tsx (typescript, 116 lines)
      📁 forgot-password/
        📄 page.tsx (typescript, 123 lines)
      📁 login/
        📄 page.tsx (typescript, 293 lines)
      📁 reset-password/
        📄 page.tsx (typescript, 149 lines)
      📁 signup/
        📄 page.tsx (typescript, 241 lines)
      📄 layout.tsx (typescript, 10 lines)
    📁 (marketing)/
      📁 _components/
        📄 comingsoon.tsx (typescript, 17 lines)
        📄 features.tsx (typescript, 72 lines)
        📄 hero.tsx (typescript, 43 lines)
        📄 index.ts (typescript, 7 lines)
        📄 skiptomain.tsx (typescript, 13 lines)
      📄 layout.tsx (typescript, 13 lines)
    📁 [tenant]/
      📁 admin/
        📁 logs/
          📄 page.tsx (typescript, 60 lines)
      📁 billing/
        📄 page.tsx (typescript, 12 lines)
      📁 cicd/
        📁 _components/
          📄 cicdprovider.tsx (typescript, 341 lines)
          📄 cicdproviderform.tsx (typescript, 453 lines)
          📄 index.ts (typescript, 3 lines)
        📄 actions.ts (typescript, 247 lines)
        📄 constants.ts (typescript, 43 lines)
        📄 layout.tsx (typescript, 14 lines)
        📄 page.tsx (typescript, 30 lines)
        📄 types.ts (typescript, 96 lines)
      📁 dashboard/
        📁 _components/
          📄 dashboardheader.tsx (typescript, 17 lines)
          📄 dashboardtabs.tsx (typescript, 40 lines)
          📄 index.ts (typescript, 10 lines)
          📄 maincontent.tsx (typescript, 163 lines)
          📄 overview.tsx (typescript, 83 lines)
          📄 recentsales.tsx (typescript, 76 lines)
          📄 statscards.tsx (typescript, 74 lines)
          📄 tabcontentcard.tsx (typescript, 23 lines)
        📄 actions.ts (typescript, 132 lines)
        📄 page.tsx (typescript, 14 lines)
        📄 types.ts (typescript, 29 lines)
      📁 deployment/
        📁 _components/
          📄 customswitch.tsx (typescript, 41 lines)
          📄 deploymentactions.tsx (typescript, 98 lines)
          📄 deploymentdetails.tsx (typescript, 552 lines)
          📄 deploymentlist.tsx (typescript, 444 lines)
          📄 deploymentnavbar.tsx (typescript, 56 lines)
          📄 deploymentrunaction.tsx (typescript, 75 lines)
          📄 deploymentwizard.tsx (typescript, 539 lines)
          📄 deploymentwizardstep1.tsx (typescript, 117 lines)
          📄 deploymentwizardstep2.tsx (typescript, 86 lines)
          📄 deploymentwizardstep3.tsx (typescript, 79 lines)
          📄 deploymentwizardstep4.tsx (typescript, 146 lines)
          📄 deploymentwizardstep5.tsx (typescript, 392 lines)
          📄 enhancedscriptselector.tsx (typescript, 206 lines)
          📄 hostselector.tsx (typescript, 184 lines)
          📄 index.ts (typescript, 16 lines)
          📄 jenkinsconfig.tsx (typescript, 414 lines)
          📄 scriptselector.tsx (typescript, 70 lines)
          📄 statusbadge.tsx (typescript, 55 lines)
        📄 actions.ts (typescript, 1346 lines)
        📄 constants.ts (typescript, 33 lines)
        📄 layout.tsx (typescript, 24 lines)
        📄 page.tsx (typescript, 66 lines)
        📄 types.ts (typescript, 188 lines)
        📄 utils.ts (typescript, 160 lines)
      📁 devices/
        📄 page.tsx (typescript, 11 lines)
      📁 hosts/
        📁 _components/
          📄 connecthostdialog.tsx (typescript, 192 lines)
          📄 connectionform.tsx (typescript, 348 lines)
          📄 hostcard.tsx (typescript, 379 lines)
          📄 hostform.tsx (typescript, 2 lines)
          📄 hostgrid.tsx (typescript, 55 lines)
          📄 hostlist.tsx (typescript, 345 lines)
          📄 hostoverview.tsx (typescript, 227 lines)
          📄 hostsettings.tsx (typescript, 108 lines)
          📄 hosttable.tsx (typescript, 144 lines)
          📄 index.ts (typescript, 13 lines)
          📄 statussummary.tsx (typescript, 118 lines)
        📁 analytics/
          📄 page.tsx (typescript, 8 lines)
        📁 settings/
          📄 page.tsx (typescript, 213 lines)
        📁 terminals/
          📄 page.tsx (typescript, 153 lines)
        📄 actions.ts (typescript, 574 lines)
        📄 constants.ts (typescript, 1 lines)
        📄 hooks.ts (typescript, 622 lines)
        📄 layout.tsx (typescript, 14 lines)
        📄 page.tsx (typescript, 6 lines)
        📄 types.ts (typescript, 62 lines)
      📁 profile/
        📄 page.tsx (typescript, 6 lines)
      📁 reports/
        📄 page.tsx (typescript, 22 lines)
      📁 repositories/
        📁 _components/
          📄 enhancedconnectrepositorydialog.tsx (typescript, 507 lines)
          📄 enhancedrepositorycard.tsx (typescript, 204 lines)
          📄 index.ts (typescript, 13 lines)
          📄 repositorydetailview.tsx (typescript, 547 lines)
          📄 repositoryexplorer.tsx (typescript, 532 lines)
        📄 actions.ts (typescript, 1430 lines)
        📄 constants.ts (typescript, 215 lines)
        📄 layout.tsx (typescript, 14 lines)
        📄 page.tsx (typescript, 815 lines)
        📄 types.ts (typescript, 181 lines)
      📁 repository/
        📄 actions.ts (typescript, 120 lines)
      📁 settings/
        📁 profile/
          📄 page.tsx (typescript, 51 lines)
        📄 layout.tsx (typescript, 20 lines)
        📄 page.tsx (typescript, 35 lines)
      📁 team/
        📄 page.tsx (typescript, 23 lines)
      📁 terminals/
        📁 _components/
          📄 index.ts (typescript, 4 lines)
          📄 terminal.tsx (typescript, 589 lines)
        📁 [hostname]/
          📄 page.tsx (typescript, 359 lines)
        📄 page.tsx (typescript, 89 lines)
      📄 layout.tsx (typescript, 52 lines)
      📄 page.tsx (typescript, 7 lines)
    📄 layout.tsx (typescript, 49 lines)
    📄 page.tsx (typescript, 45 lines)
  📁 actions/
    📄 auth.ts (typescript, 231 lines)
    📄 index.ts (typescript, 5 lines)
    📄 session.ts (typescript, 23 lines)
    📄 user.ts (typescript, 217 lines)
  📁 api/
    📁 auth/
      📁 register/
        📄 route.ts (typescript, 135 lines)
    📁 fetch-all-repositories/
      📄 route.ts (typescript, 23 lines)
    📁 git-providers/
      📁 [id]/
        📄 route.ts (typescript, 57 lines)
      📁 callback/
        📄 route.ts (typescript, 50 lines)
      📄 route.ts (typescript, 74 lines)
    📁 hosts/
      📁 [id]/
        📄 route.ts (typescript, 36 lines)
      📁 byname/
        📁 [name]/
          📄 route.ts (typescript, 80 lines)
      📁 test-all/
        📄 route.ts (typescript, 93 lines)
      📁 test-connection/
        📄 route.ts (typescript, 95 lines)
      📁 verify-fingerprint/
        📄 route.ts (typescript, 66 lines)
      📄 route.ts (typescript, 101 lines)
    📁 repositories/
      📁 [id]/
        📁 file-content/
          📄 route.ts (typescript, 221 lines)
        📁 files/
          📄 route.ts (typescript, 175 lines)
        📁 star/
          📄 route.ts (typescript, 83 lines)
        📁 sync/
          📄 route.ts (typescript, 43 lines)
        📁 unstar/
          📄 route.ts (typescript, 66 lines)
        📄 route.ts (typescript, 119 lines)
      📁 explore/
        📄 route.ts (typescript, 370 lines)
      📁 refresh-all/
        📄 route.ts (typescript, 70 lines)
      📁 starred/
        📄 route.ts (typescript, 170 lines)
      📁 sync/
        📁 [id]/
          📄 route.ts (typescript, 32 lines)
      📁 test-connection/
        📄 route.ts (typescript, 32 lines)
        📄 schema.ts (typescript, 12 lines)
      📁 verify/
        📄 route.ts (typescript, 94 lines)
      📄 route.ts (typescript, 85 lines)
    📁 terminals/
      📁 [id]/
        📄 route.ts (typescript, 84 lines)
      📁 init/
        📄 route.ts (typescript, 40 lines)
      📁 ws/
        📁 [id]/
          📄 route.ts (typescript, 29 lines)
    📁 v1/
      📁 cicd/
        📁 test/
          📄 route.ts (typescript, 25 lines)
  📄 globals.css (css, 157 lines)
  📄 layout.tsx (typescript, 76 lines)
  📄 page.tsx (typescript, 10 lines)
📁 components/
  📁 dialog/
    📄 commandmenu.tsx (typescript, 106 lines)
    📄 confirmdialog.tsx (typescript, 67 lines)
  📁 form/
    📁 pininput/
      📄 context.tsx (typescript, 4 lines)
      📄 index.tsx (typescript, 114 lines)
      📄 pininput.common.tsx (typescript, 23 lines)
      📄 pininputfield.tsx (typescript, 34 lines)
      📄 types.ts (typescript, 96 lines)
      📄 usepininput.ts (typescript, 160 lines)
      📄 utils.ts (typescript, 22 lines)
    📄 passwordinput.tsx (typescript, 40 lines)
    📄 pininput.tsx (typescript, 329 lines)
    📄 selectdropdown.tsx (typescript, 64 lines)
  📁 icons/
    📄 activitylogicon.tsx (typescript, 21 lines)
    📄 index.tsx (typescript, 39 lines)
  📁 layout/
    📁 data/
    📄 appsidebar.tsx (typescript, 130 lines)
    📄 baseheader.tsx (typescript, 45 lines)
    📄 emptystate.tsx (typescript, 20 lines)
    📄 footer.tsx (typescript, 77 lines)
    📄 main.tsx (typescript, 24 lines)
    📄 navgroup.tsx (typescript, 167 lines)
    📄 navuser.tsx (typescript, 114 lines)
    📄 pageheader.tsx (typescript, 24 lines)
    📄 roleswitcher.tsx (typescript, 113 lines)
    📄 siteheader.tsx (typescript, 64 lines)
    📄 teamswitcher.tsx (typescript, 112 lines)
    📄 topnav.tsx (typescript, 16 lines)
    📄 upgradeprompt.tsx (typescript, 35 lines)
    📄 workspaceheader.tsx (typescript, 124 lines)
  📁 layouts/
    📁 sidebar/
  📁 profile/
    📄 profilecontent.tsx (typescript, 170 lines)
    📄 profiledropdown.tsx (typescript, 99 lines)
    📄 userprofile.tsx (typescript, 114 lines)
  📁 providers/
    📄 index.ts (typescript, 3 lines)
    📄 swrprovider.tsx (typescript, 19 lines)
    📄 themeprovider.tsx (typescript, 40 lines)
  📁 repository/
  📁 settings/
    📄 languagesettings.tsx (typescript, 68 lines)
    📄 settingsheader.tsx (typescript, 28 lines)
  📁 shadcn/
    📄 accordion.tsx (typescript, 55 lines)
    📄 alert-dialog.tsx (typescript, 117 lines)
    📄 alert.tsx (typescript, 53 lines)
    📄 avatar.tsx (typescript, 49 lines)
    📄 badge.tsx (typescript, 35 lines)
    📄 breadcrumb.tsx (typescript, 113 lines)
    📄 button.tsx (typescript, 51 lines)
    📄 card.tsx (typescript, 57 lines)
    📄 checkbox.tsx (typescript, 30 lines)
    📄 collapsible.tsx (typescript, 12 lines)
    📄 command.tsx (typescript, 154 lines)
    📄 dialog.tsx (typescript, 108 lines)
    📄 dropdown-menu.tsx (typescript, 189 lines)
    📄 form.tsx (typescript, 169 lines)
    📄 input.tsx (typescript, 28 lines)
    📄 label.tsx (typescript, 21 lines)
    📄 language-switcher.tsx (typescript, 55 lines)
    📄 pagination.tsx (typescript, 102 lines)
    📄 popover.tsx (typescript, 33 lines)
    📄 radio-group.tsx (typescript, 38 lines)
    📄 scroll-area.tsx (typescript, 55 lines)
    📄 search.tsx (typescript, 33 lines)
    📄 select.tsx (typescript, 122 lines)
    📄 separator.tsx (typescript, 26 lines)
    📄 sheet.tsx (typescript, 123 lines)
    📄 sidebar.tsx (typescript, 756 lines)
    📄 skeleton.tsx (typescript, 8 lines)
    📄 switch.tsx (typescript, 29 lines)
    📄 table.tsx (typescript, 94 lines)
    📄 tabs.tsx (typescript, 57 lines)
    📄 textarea.tsx (typescript, 27 lines)
    📄 theme-toggle.tsx (typescript, 113 lines)
    📄 toaster.tsx (typescript, 8 lines)
    📄 tooltip.tsx (typescript, 32 lines)
    📄 use-toast.ts (typescript, 30 lines)
  📁 sidebar/
    📄 constants.ts (typescript, 17 lines)
    📄 index.tsx (typescript, 22 lines)
    📄 sidebar.tsx (typescript, 112 lines)
    📄 sidebarcontent.tsx (typescript, 22 lines)
    📄 sidebardata.ts (typescript, 158 lines)
    📄 sidebarfooter.tsx (typescript, 20 lines)
    📄 sidebargroup.tsx (typescript, 19 lines)
    📄 sidebargroupaction.tsx (typescript, 28 lines)
    📄 sidebargroupcontent.tsx (typescript, 18 lines)
    📄 sidebargrouplabel.tsx (typescript, 27 lines)
    📄 sidebarheader.tsx (typescript, 20 lines)
    📄 sidebarinput.tsx (typescript, 24 lines)
    📄 sidebarinset.tsx (typescript, 22 lines)
    📄 sidebarmenu.tsx (typescript, 17 lines)
    📄 sidebarmenubutton.tsx (typescript, 88 lines)
    📄 sidebarmenuitem.tsx (typescript, 18 lines)
    📄 sidebarmenusub.tsx (typescript, 18 lines)
    📄 sidebarmenusubbutton.tsx (typescript, 91 lines)
    📄 sidebarrail.tsx (typescript, 37 lines)
    📄 sidebarseparator.tsx (typescript, 19 lines)
    📄 sidebartrigger.tsx (typescript, 34 lines)
  📁 theme/
    📄 themeprovider.tsx (typescript, 39 lines)
    📄 themeswitch.tsx (typescript, 52 lines)
  📁 ui/
    📄 breadcrumb.tsx (typescript, 113 lines)
    📄 loadingspinner.tsx (typescript, 18 lines)
    📄 longtext.tsx (typescript, 81 lines)
    📄 search.tsx (typescript, 36 lines)
📁 config/
  📄 fonts.ts (typescript, 29 lines)
📁 context/
  📄 appcontext.tsx (typescript, 278 lines)
  📄 cicdcontext.tsx (typescript, 430 lines)
  📄 deploymentcontext.tsx (typescript, 480 lines)
  📄 fontcontext.tsx (typescript, 49 lines)
  📄 hostcontext.tsx (typescript, 649 lines)
  📄 index.ts (typescript, 28 lines)
  📄 repositorycontext.tsx (typescript, 376 lines)
  📄 searchcontext.tsx (typescript, 42 lines)
  📄 sidebarcontext.tsx (typescript, 120 lines)
  📄 themecontext.tsx (typescript, 72 lines)
  📄 usercontext.tsx (typescript, 276 lines)
📁 hooks/
  📄 usemobile.tsx (typescript, 22 lines)
  📄 userequestprotection.ts (typescript, 99 lines)
  📄 usesidebar.ts (typescript, 74 lines)
  📄 useuser.ts (typescript, 15 lines)
📁 i18n/
  📁 messages/
    📄 en.json (json configuration, 361 lines)
    📄 fr.json (json configuration, 346 lines)
  📄 index.ts (typescript, 8 lines)
  📄 request.ts (typescript, 19 lines)
📁 lib/
  📁 gitea-api/
    📄 index.ts (typescript, 213 lines)
  📁 github-api/
    📄 index.ts (typescript, 221 lines)
  📁 gitlab-api/
    📄 index.ts (typescript, 254 lines)
  📁 services/
    📁 cicd/
      📄 factory.ts (typescript, 38 lines)
      📄 github.ts (typescript, 444 lines)
      📄 index.ts (typescript, 84 lines)
      📄 interfaces.ts (typescript, 73 lines)
      📄 jenkins.ts (typescript, 731 lines)
      📄 xml-generators.ts (typescript, 72 lines)
    📄 hosts.ts (typescript, 408 lines)
    📄 http.ts (typescript, 400 lines)
    📄 index.ts (typescript, 11 lines)
    📄 oauth.ts (typescript, 60 lines)
    📄 ssh.ts (typescript, 458 lines)
    📄 terminal.ts (typescript, 194 lines)
    📄 websocket.ts (typescript, 298 lines)
  📁 supabase/
    📁 db-cicd/
      📄 cicd.ts (typescript, 742 lines)
      📄 index.ts (typescript, 8 lines)
    📁 db-deployment/
      📄 deployment.ts (typescript, 254 lines)
      📄 index.ts (typescript, 8 lines)
    📁 db-hosts/
      📄 host.ts (typescript, 109 lines)
      📄 index.ts (typescript, 6 lines)
    📁 db-repositories/
      📄 git-provider.ts (typescript, 341 lines)
      📄 index.ts (typescript, 12 lines)
      📄 pin-repository.ts (typescript, 177 lines)
      📄 repository.ts (typescript, 540 lines)
      📄 star-repository.ts (typescript, 163 lines)
      📄 utils.ts (typescript, 185 lines)
    📄 admin.ts (typescript, 36 lines)
    📄 auth.ts (typescript, 520 lines)
    📄 client.ts (typescript, 31 lines)
    📄 db.ts (typescript, 255 lines)
    📄 index.ts (typescript, 17 lines)
    📄 middleware.ts (typescript, 161 lines)
    📄 server.ts (typescript, 33 lines)
  📄 cache.ts (typescript, 144 lines)
  📄 chart.ts (typescript, 18 lines)
  📄 env.ts (typescript, 56 lines)
  📄 features.ts (typescript, 85 lines)
  📄 logger.ts (typescript, 52 lines)
  📄 utils.ts (typescript, 29 lines)
📁 migrations/
📁 types/
  📁 context/
    📄 app.ts (typescript, 15 lines)
    📄 cicd.ts (typescript, 81 lines)
    📄 constants.ts (typescript, 81 lines)
    📄 deployment.ts (typescript, 67 lines)
    📄 host.ts (typescript, 139 lines)
    📄 repository.ts (typescript, 62 lines)
    📄 user.ts (typescript, 14 lines)
  📄 environment.d.ts (typescript, 23 lines)
  📄 features.ts (typescript, 17 lines)
  📄 logger.ts (typescript, 33 lines)
  📄 scripts.ts (typescript, 38 lines)
  📄 sidebar.ts (typescript, 22 lines)
  📄 ssh.ts (typescript, 33 lines)
  📄 supabase.ts (typescript, 440 lines)
  📄 user.ts (typescript, 115 lines)
📁 utils/
  📄 contexthelpers.ts (typescript, 97 lines)
  📄 createsafecontext.ts (typescript, 100 lines)
  📄 electronapi.ts (typescript, 75 lines)
  📄 iselectron.ts (typescript, 13 lines)
  📄 logger.ts (typescript, 21 lines)
  📄 loopprotectedcontext.md (documentation, 181 lines)
📄 config.ts (typescript, 35 lines)
📄 middleware.ts (typescript, 118 lines)
```

