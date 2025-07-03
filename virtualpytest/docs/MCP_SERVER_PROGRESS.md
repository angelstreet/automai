# VirtualPyTest MCP Server Implementation Progress

## **Project Overview**

Create a simple MCP (Model Context Protocol) server that allows LLMs to control the VirtualPyTest web application through URL parameters and backend API routes.

---

## **Phase 1: Simple Page Navigation**

### **1.1 Test Current Pages - Start Here!**

- [ ] **Test Actual Pages in virtualpytest/src/web/pages**
  - [ ] Manually navigate to `/dashboard` in browser
  - [ ] Manually navigate to `/rec` in browser
  - [ ] Manually navigate to `/userinterface` in browser
  - [ ] Manually navigate to `/runTests` in browser
  - [ ] Confirm all pages load correctly

---

## **Phase 2: Simple Backend Route for Page Navigation**

### **2.1 Create Simple Navigate Route**

- [x] **Create `server_frontend_routes.py`**

  - [x] Add blueprint setup
  - [x] Create `/server/frontend/navigate` endpoint
  - [x] Handle page parameter (`dashboard`, `rec`, `userinterface`, `runTests`)
  - [x] Return simple redirect URL

- [x] **Add Route Registration**
  - [x] Add frontend routes to `__init__.py`
  - [x] Register blueprint in server mode
  - [ ] Test route accessibility

---

## **Phase 3: MCP Server Structure**

### **3.1 Create MCP Server Directory**

- [x] **Setup Directory Structure**
  - [x] Create `mcp_server.py` main server file
  - [x] Create `tools_config.json` configuration file

### **3.2 Tools Configuration (SIMPLIFIED)**

- [x] **Create `tools_config.json`** with meaningful tools only
  - [ ] **Frontend Navigation (4 tools)**
    - [ ] `goto_dashboard` tool
    - [ ] `goto_rec` tool
    - [ ] `goto_userinterface` tool
    - [ ] `goto_runTests` tool
      - [ ] **Actions (2-3 meaningful tools from server_actions_routes.py)**
      - [ ] `execute_navigation_to_node` tool (from navigation_executor.py)
    - [ ] **Remote Control (2-3 meaningful tools from server_remote_routes.py)**
      - [ ] `remote_execute_command` tool
    - [ ] **Navigation (2-3 meaningful tools from server_navigation_routes.py)**
      - [ ] `navigate_to_page` tool
  - [ ] **AI Agent (2-3 meaningful tools from server_aiagent_routes.py)**
    - [ ] `aiagent_execute_task` tool

### **3.3 MCP Server Implementation**

- [x] **Create `mcp_server.py`**
  - [x] Implement MCP server with proper protocol
  - [x] Add `load_tools_config()` method
  - [x] Add `handle_list_tools()` method
  - [x] Add `handle_call_tool()` method
  - [x] Add error handling and logging

---

## **Phase 4: Simple MCP Task Input (Global LLM Communication)**

### **4.1 Create Simple MCP Input Component**

- [ ] **Create `MCPTaskInput.tsx`** (simple version of MonitoringPlayer AI panel)
  - [ ] Sliding panel from left side (positioned absolute)
  - [ ] MCP robot icon button (always visible on left edge)
  - [ ] Sliding panel animation (left to right, 300ms transition)
  - [ ] Simple input field for task description
  - [ ] Send button to submit task
  - [ ] Loading state while processing
  - [ ] Simple success/error message display (no history)

### **4.2 Create Simple MCP Hook**

- [ ] **Create `useMCPTask.tsx`** hook
  - [ ] State management for panel visibility
  - [ ] Current task input state
  - [ ] Send task to backend
  - [ ] Handle basic responses (success/error)
  - [ ] Loading state management
  - [ ] Simple error handling

### **4.3 Create MCP Server Route**

- [ ] **Create `server_mcp_routes.py`**
  - [ ] Add blueprint setup for MCP communication
  - [ ] Create `/server/mcp/execute-task` endpoint (POST)
  - [ ] Handle task execution using our basic routes:
    - [ ] `navigate_to_page` tool
    - [ ] `execute_navigation_to_node` tool
    - [ ] `remote_execute_command` tool
  - [ ] Return simple success/error responses
  - [ ] Add basic error handling and logging

### **4.4 Global Integration**

- [ ] **Add MCPTaskInput to Layout**
  - [ ] Add to main app layout (visible on all pages)
  - [ ] Position on left side with high z-index
  - [ ] Simple overlay that doesn't interfere with existing UI

---

## **Phase 5: Integration Testing**

### **5.1 Test MCP Server Standalone**

- [ ] **Test MCP Server Standalone**
  - [ ] Test tool configuration loading
  - [ ] Test tool discovery
  - [ ] Test frontend navigation tools
  - [ ] Test backend API tools

### **5.2 Test MCP Task Integration**

- [ ] **Test MCP Task Component**
  - [ ] Test overlay sliding animation
  - [ ] Test task input and submission
  - [ ] Test basic MCP tool execution
  - [ ] Test error handling and loading states

### **5.3 Test Key Workflows**

- [ ] **Test Core Workflows**
  - [ ] Test: "Go to rec page" via MCP task input
  - [ ] Test: "Execute remote command" via MCP task input
  - [ ] Test: "Execute navigation" via MCP task input

---

## **Completion Criteria**

### **Minimum Viable Product (MVP)**

- [x] ✅ **Planning Complete** - Simplified implementation plan created
- [ ] Frontend page navigation working
- [ ] Backend navigation endpoint working
- [ ] Basic MCP server with ~15 meaningful tools working
- [ ] End-to-end test: Navigate to rec page via MCP

---

## **Progress Tracking**

**Started:** [DATE]  
**Current Phase:** Phase 1 - Simple Page Navigation  
**Completion:** 60% (Phases 2-3 completed, Phase 1,4,5 remaining)

**Last Updated:** [DATE]  
**Next Milestone:** Complete Phase 4 - Simple MCP Task Input Component
