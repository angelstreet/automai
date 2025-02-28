#!/usr/bin/env node

/**
 * Debug Development Server Manager
 *
 * This script manages the development servers in debug mode by:
 * 1. Checking if servers are already running
 * 2. Killing existing processes if needed
 * 3. Starting Next.js, browser tools server, and Prisma Studio
 *
 * Usage: npm run dev:debug
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
  white: '\x1b[37m',
};

// Configuration
const NEXT_PORT = 3000;
const BROWSER_TOOLS_PORT = 8080;
const PRISMA_STUDIO_PORT = 5555;

// Function to check if a port is in use
function isPortInUse(port) {
  try {
    const command =
      os.platform() === 'win32' ? `netstat -ano | findstr :${port}` : `lsof -i:${port} -t`;

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
        console.log(
          `${colors.yellow}Killed process on port ${port} (PID: ${pidMatch[1]})${colors.reset}`,
        );
      }
    } else {
      // Unix-like (macOS, Linux)
      const pidCommand = `lsof -i:${port} -t`;
      const pids = execSync(pidCommand, { encoding: 'utf8' }).trim().split('\n');

      pids.forEach((pid) => {
        if (pid) {
          execSync(`kill -9 ${pid}`);
          console.log(
            `${colors.yellow}Killed process on port ${port} (PID: ${pid})${colors.reset}`,
          );
        }
      });
    }
    return true;
  } catch (error) {
    console.log(`${colors.red}No process found on port ${port}${colors.reset}`);
    return false;
  }
}

// Function to kill process by name
function killProcessByName(processName) {
  try {
    if (os.platform() === 'win32') {
      // Windows
      execSync(`taskkill /F /IM ${processName}.exe`, { stdio: 'ignore' });
    } else {
      // Unix-like (macOS, Linux)
      execSync(`pkill -f "${processName}"`, { stdio: 'ignore' });
    }
    console.log(`${colors.yellow}Killed process: ${processName}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}No process found: ${processName}${colors.reset}`);
    return false;
  }
}

// Main function
async function main() {
  console.log(`${colors.cyan}=== Debug Development Server Manager ===${colors.reset}`);

  // Clean .next directory
  console.log(`${colors.yellow}Cleaning .next directory...${colors.reset}`);
  try {
    execSync('rm -rf .next', { stdio: 'inherit' });
    console.log(`${colors.green}.next directory cleaned${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}Error cleaning .next directory: ${error.message}${colors.reset}`);
  }

  // Check and kill Next.js server if running
  if (isPortInUse(NEXT_PORT)) {
    console.log(
      `${colors.yellow}Next.js server is already running on port ${NEXT_PORT}${colors.reset}`,
    );
    killProcessOnPort(NEXT_PORT);
  }

  // Check and kill browser tools server if running
  if (isPortInUse(BROWSER_TOOLS_PORT)) {
    console.log(
      `${colors.yellow}Browser tools server is already running on port ${BROWSER_TOOLS_PORT}${colors.reset}`,
    );
    killProcessOnPort(BROWSER_TOOLS_PORT);
  } else {
    // Try to kill by name if port check fails
    killProcessByName('@agentdeskai/browser-tools-server');
  }

  // Check and kill Prisma Studio if running
  if (isPortInUse(PRISMA_STUDIO_PORT)) {
    console.log(
      `${colors.yellow}Prisma Studio is already running on port ${PRISMA_STUDIO_PORT}${colors.reset}`,
    );
    killProcessOnPort(PRISMA_STUDIO_PORT);
  }

  // Small delay to ensure ports are released
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Start all servers
  console.log(`${colors.green}Starting debug development servers...${colors.reset}`);

  // Start Next.js
  const nextProcess = spawn('npm', ['run', 'dev:next'], {
    stdio: 'inherit',
    shell: true,
  });

  // Start browser tools server
  const browserToolsProcess = spawn('npx', ['@agentdeskai/browser-tools-server'], {
    stdio: 'inherit',
    shell: true,
  });

  // Start Prisma Studio
  const prismaStudioProcess = spawn('npm', ['run', 'prisma:studio'], {
    stdio: 'inherit',
    shell: true,
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`${colors.red}Shutting down all servers...${colors.reset}`);

    // Force kill processes on ports
    killProcessOnPort(NEXT_PORT);
    killProcessOnPort(BROWSER_TOOLS_PORT);
    killProcessOnPort(PRISMA_STUDIO_PORT);

    // Also try to kill the child processes directly
    if (nextProcess && nextProcess.pid) {
      try {
        process.kill(nextProcess.pid, 'SIGKILL');
      } catch (error) {
        console.log(`${colors.yellow}Could not kill Next.js process directly${colors.reset}`);
      }
    }

    if (browserToolsProcess && browserToolsProcess.pid) {
      try {
        process.kill(browserToolsProcess.pid, 'SIGKILL');
      } catch (error) {
        console.log(`${colors.yellow}Could not kill browser tools process directly${colors.reset}`);
      }
    }

    if (prismaStudioProcess && prismaStudioProcess.pid) {
      try {
        process.kill(prismaStudioProcess.pid, 'SIGKILL');
      } catch (error) {
        console.log(`${colors.yellow}Could not kill Prisma Studio process directly${colors.reset}`);
      }
    }

    // Also try to kill by name for browser tools which can be tricky
    killProcessByName('@agentdeskai/browser-tools-server');

    console.log(`${colors.green}All servers shut down${colors.reset}`);
    process.exit(0);
  });

  // Log process IDs
  console.log(`${colors.green}Next.js server started (PID: ${nextProcess.pid})${colors.reset}`);
  console.log(
    `${colors.green}Browser tools server started (PID: ${browserToolsProcess.pid})${colors.reset}`,
  );
  console.log(
    `${colors.green}Prisma Studio started (PID: ${prismaStudioProcess.pid})${colors.reset}`,
  );
  console.log(`${colors.cyan}Press Ctrl+C to stop all servers${colors.reset}`);
}

// Run the script
main().catch((error) => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
