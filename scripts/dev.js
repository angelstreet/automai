#!/usr/bin/env node

/**
 * Development Server Manager
 * 
 * This script manages the development servers by:
 * 1. Checking if servers are already running
 * 2. Killing existing processes if needed
 * 3. Starting both Next.js and the backend server
 * 
 * Usage: npm run dev:all
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Configuration
const NEXT_PORT = 3000;
const SERVER_PORT = 3001;

// Function to check if a port is in use
function isPortInUse(port) {
  try {
    const command = os.platform() === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i:${port} -t`;
    
    const result = execSync(command, { encoding: 'utf8' });
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// Function to kill process on a specific port
function killProcessOnPort(port) {
  try {
    if (os.platform() === 'win32') {
      // Windows
      const pidCommand = `netstat -ano | findstr :${port}`;
      const output = execSync(pidCommand, { encoding: 'utf8' });
      const pidMatch = output.match(/\s+(\d+)$/m);
      
      if (pidMatch && pidMatch[1]) {
        execSync(`taskkill /F /PID ${pidMatch[1]}`);
        console.log(`${colors.yellow}Killed process on port ${port} (PID: ${pidMatch[1]})${colors.reset}`);
      }
    } else {
      // Unix-like (macOS, Linux)
      const pidCommand = `lsof -i:${port} -t`;
      const pids = execSync(pidCommand, { encoding: 'utf8' }).trim().split('\n');
      
      pids.forEach(pid => {
        if (pid) {
          execSync(`kill -9 ${pid}`);
          console.log(`${colors.yellow}Killed process on port ${port} (PID: ${pid})${colors.reset}`);
        }
      });
    }
    return true;
  } catch (error) {
    console.log(`${colors.red}No process found on port ${port}${colors.reset}`);
    return false;
  }
}

// Main function
async function main() {
  console.log(`${colors.cyan}=== Development Server Manager ===${colors.reset}`);
  
  // Check and kill Next.js server if running
  if (isPortInUse(NEXT_PORT)) {
    console.log(`${colors.yellow}Next.js server is already running on port ${NEXT_PORT}${colors.reset}`);
    killProcessOnPort(NEXT_PORT);
  }
  
  // Check and kill backend server if running
  if (isPortInUse(SERVER_PORT)) {
    console.log(`${colors.yellow}Backend server is already running on port ${SERVER_PORT}${colors.reset}`);
    killProcessOnPort(SERVER_PORT);
  }
  
  // Small delay to ensure ports are released
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Start both servers
  console.log(`${colors.green}Starting development servers...${colors.reset}`);
  
  // Start Next.js
  const nextProcess = spawn('npm', ['run', 'dev:next'], { 
    stdio: 'inherit',
    shell: true
  });
  
  // Start backend server
  const serverProcess = spawn('npm', ['run', 'server:dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`${colors.red}Shutting down servers...${colors.reset}`);
    nextProcess.kill();
    serverProcess.kill();
    process.exit(0);
  });
  
  // Log process IDs
  console.log(`${colors.green}Next.js server started (PID: ${nextProcess.pid})${colors.reset}`);
  console.log(`${colors.green}Backend server started (PID: ${serverProcess.pid})${colors.reset}`);
  console.log(`${colors.cyan}Press Ctrl+C to stop both servers${colors.reset}`);
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
}); 