- **name:** automai
- **version:** 0.2.0
- **description:** automai is a multi-tenant saas platform designed for end-to-end test automation across web, desktop, and mobile environments.
```bash
node scripts/generate-structure.js
```

# automai3 project structure

generated on: 3/13/2025, 1:01:42 AM

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
        📄 skiptomain.tsx (typescript, 13 lines)
      📄 layout.tsx (typescript, 13 lines)
    📁 [tenant]/
      📁 admin/
        📁 logs/
          📄 page.tsx (typescript, 60 lines)
      📁 billing/
        📄 page.tsx (typescript, 12 lines)
      📁 dashboard/
        📁 _components/
          📄 dashboardheader.tsx (typescript, 17 lines)
          📄 dashboardtabs.tsx (typescript, 40 lines)
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
          📄 deploymentdetails.tsx (typescript, 435 lines)
          📄 deploymentlist.tsx (typescript, 274 lines)
          📄 deploymentwizard.tsx (typescript, 548 lines)
          📄 hostselector.tsx (typescript, 84 lines)
          📄 scriptselector.tsx (typescript, 70 lines)
          📄 statusbadge.tsx (typescript, 50 lines)
        📄 actions.ts (typescript, 173 lines)
        📄 constants.ts (typescript, 33 lines)
        📄 page.tsx (typescript, 87 lines)
        📄 types.ts (typescript, 99 lines)
        📄 usedeployments.ts (typescript, 265 lines)
        📄 utils.ts (typescript, 112 lines)
      📁 development/
        📁 projects/
          📄 page.tsx (typescript, 448 lines)
        📁 usecases/
          📁 edit/
            📁 [usecaseid]/
              📄 page.tsx (typescript, 52 lines)
          📄 page.tsx (typescript, 43 lines)
      📁 devices/
        📄 page.tsx (typescript, 11 lines)
      📁 hosts/
        📁 _components/
          📄 connecthostdialog.tsx (typescript, 258 lines)
          📄 connectionform.tsx (typescript, 395 lines)
          📄 hostcard.tsx (typescript, 334 lines)
          📄 hostform.tsx (typescript, 2 lines)
          📄 hostgrid.tsx (typescript, 55 lines)
          📄 hostlist.tsx (typescript, 190 lines)
          📄 hostoverview.tsx (typescript, 227 lines)
          📄 hostsettings.tsx (typescript, 108 lines)
          📄 hosttable.tsx (typescript, 144 lines)
          📄 statussummary.tsx (typescript, 118 lines)
        📁 analytics/
          📄 page.tsx (typescript, 8 lines)
        📁 settings/
          📄 page.tsx (typescript, 213 lines)
        📁 terminals/
          📄 page.tsx (typescript, 153 lines)
        📄 actions.ts (typescript, 269 lines)
        📄 constants.ts (typescript, 1 lines)
        📄 hooks.ts (typescript, 606 lines)
        📄 page.tsx (typescript, 6 lines)
        📄 types.ts (typescript, 36 lines)
      📁 profile/
        📄 page.tsx (typescript, 6 lines)
      📁 projects/
        📄 page.tsx (typescript, 13 lines)
      📁 reports/
        📄 page.tsx (typescript, 22 lines)
      📁 repositories/
        📁 _components/
          📄 constants.ts (typescript, 238 lines)
          📄 enhancedconnectrepositorydialog.tsx (typescript, 427 lines)
          📄 enhancedrepositorycard.tsx (typescript, 172 lines)
          📄 index.ts (typescript, 14 lines)
          📄 repositoryexplorer.tsx (typescript, 287 lines)
        📄 actions.ts (typescript, 469 lines)
        📄 constants.ts (typescript, 1 lines)
        📄 hooks.ts (typescript, 483 lines)
        📄 page.tsx (typescript, 454 lines)
        📄 types.ts (typescript, 60 lines)
      📁 settings/
        📁 profile/
          📄 page.tsx (typescript, 51 lines)
        📄 layout.tsx (typescript, 20 lines)
        📄 page.tsx (typescript, 35 lines)
      📁 team/
        📄 page.tsx (typescript, 23 lines)
      📁 terminals/
        📁 _components/
          📄 terminal.tsx (typescript, 589 lines)
        📁 [hostname]/
          📄 page.tsx (typescript, 359 lines)
        📄 page.tsx (typescript, 89 lines)
      📁 tests/
        📄 page.tsx (typescript, 23 lines)
      📄 layout.tsx (typescript, 48 lines)
      📄 page.tsx (typescript, 6 lines)
    📄 layout.tsx (typescript, 49 lines)
    📄 page.tsx (typescript, 25 lines)
  📁 actions/
    📄 auth.ts (typescript, 231 lines)
    📄 index.ts (typescript, 5 lines)
    📄 session.ts (typescript, 23 lines)
    📄 user.ts (typescript, 163 lines)
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
        📄 route.ts (typescript, 118 lines)
      📁 sync/
        📁 [id]/
          📄 route.ts (typescript, 32 lines)
      📁 test-connection/
        📄 route.ts (typescript, 32 lines)
        📄 schema.ts (typescript, 12 lines)
      📄 route.ts (typescript, 56 lines)
    📁 terminals/
      📁 [id]/
        📄 route.ts (typescript, 84 lines)
      📁 init/
        📄 route.ts (typescript, 40 lines)
      📁 ws/
        📁 [id]/
          📄 route.ts (typescript, 29 lines)
  📄 globals.css (css, 128 lines)
  📄 layout.tsx (typescript, 84 lines)
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
  📁 profile/
    📄 profilecontent.tsx (typescript, 170 lines)
    📄 profiledropdown.tsx (typescript, 99 lines)
    📄 userprofile.tsx (typescript, 114 lines)
  📁 providers/
    📄 index.ts (typescript, 3 lines)
    📄 swrprovider.tsx (typescript, 19 lines)
    📄 themeprovider.tsx (typescript, 40 lines)
  📁 settings/
    📄 languagesettings.tsx (typescript, 68 lines)
    📄 settingsheader.tsx (typescript, 28 lines)
  📁 shadcn/
    📄 accordion.tsx (typescript, 55 lines)
    📄 alert-dialog.tsx (typescript, 117 lines)
    📄 alert.tsx (typescript, 53 lines)
    📄 avatar.tsx (typescript, 49 lines)
    📄 badge.tsx (typescript, 35 lines)
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
    📄 sidebardata.ts (typescript, 151 lines)
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
    📄 loadingspinner.tsx (typescript, 18 lines)
    📄 longtext.tsx (typescript, 81 lines)
    📄 search.tsx (typescript, 36 lines)
📁 config/
  📄 fonts.ts (typescript, 29 lines)
📁 context/
  📄 fontcontext.tsx (typescript, 49 lines)
  📄 searchcontext.tsx (typescript, 42 lines)
  📄 sidebarcontext.tsx (typescript, 120 lines)
  📄 themecontext.tsx (typescript, 72 lines)
  📄 usercontext.tsx (typescript, 175 lines)
📁 hooks/
  📄 usemobile.tsx (typescript, 22 lines)
  📄 usesidebar.ts (typescript, 74 lines)
  📄 useuser.ts (typescript, 12 lines)
📁 i18n/
  📁 messages/
    📄 en.json (json configuration, 339 lines)
    📄 fr.json (json configuration, 337 lines)
  📄 index.ts (typescript, 8 lines)
  📄 request.ts (typescript, 19 lines)
📁 lib/
  📁 services/
    📄 hosts.ts (typescript, 388 lines)
    📄 http.ts (typescript, 400 lines)
    📄 index.ts (typescript, 11 lines)
    📄 oauth.ts (typescript, 60 lines)
    📄 repositories.ts (typescript, 300 lines)
    📄 ssh.ts (typescript, 458 lines)
    📄 terminal.ts (typescript, 194 lines)
    📄 websocket.ts (typescript, 298 lines)
  📁 supabase/
    📄 admin.ts (typescript, 36 lines)
    📄 auth.ts (typescript, 436 lines)
    📄 client.ts (typescript, 31 lines)
    📄 db.ts (typescript, 594 lines)
    📄 index.ts (typescript, 12 lines)
    📄 middleware.ts (typescript, 140 lines)
    📄 server.ts (typescript, 31 lines)
  📄 cache.ts (typescript, 106 lines)
  📄 chart.ts (typescript, 18 lines)
  📄 env.ts (typescript, 56 lines)
  📄 features.ts (typescript, 85 lines)
  📄 logger.ts (typescript, 52 lines)
  📄 utils.ts (typescript, 29 lines)
📁 types/
  📄 environment.d.ts (typescript, 23 lines)
  📄 features.ts (typescript, 17 lines)
  📄 logger.ts (typescript, 33 lines)
  📄 scripts.ts (typescript, 38 lines)
  📄 sidebar.ts (typescript, 22 lines)
  📄 ssh.ts (typescript, 33 lines)
  📄 supabase.ts (typescript, 421 lines)
  📄 user.ts (typescript, 117 lines)
📁 utils/
  📄 electronapi.ts (typescript, 75 lines)
  📄 iselectron.ts (typescript, 13 lines)
📄 config.ts (typescript, 35 lines)
📄 middleware.ts (typescript, 162 lines)
```

