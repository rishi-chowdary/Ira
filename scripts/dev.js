import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');
const backendDir = path.resolve(rootDir, 'backend');

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const GRAY = '\x1b[90m';

function banner() {
  console.log(`\n${CYAN}${BOLD}╔════════════════════════════════════════════════════════════╗`);
  console.log(`║           🪙  IRA PLATFORM — ALL-IN-ONE DEV RUNNER          ║`);
  console.log(`║    Frontend • Backend • Database • Security • API          ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝${RESET}\n`);
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const proc = spawn(isWindows ? `${command}.cmd` : command, args, {
      cwd,
      stdio: 'inherit',
      shell: isWindows,
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function checkEnvironment() {
  // Ensure root .env exists
  const rootEnv = path.join(rootDir, '.env');
  const rootEnvExample = path.join(rootDir, '.env.example');
  if (!fs.existsSync(rootEnv) && fs.existsSync(rootEnvExample)) {
    fs.copyFileSync(rootEnvExample, rootEnv);
  }

  // Ensure frontend/.env exists
  const frontendEnv = path.join(frontendDir, '.env');
  const frontendEnvExample = path.join(frontendDir, '.env.example');
  if (!fs.existsSync(frontendEnv) && fs.existsSync(frontendEnvExample)) {
    console.log(`${YELLOW}ℹ Creating frontend/.env from frontend/.env.example...${RESET}`);
    fs.copyFileSync(frontendEnvExample, frontendEnv);
  }

  // Ensure backend/.env exists
  const backendEnv = path.join(backendDir, '.env');
  const backendEnvExample = path.join(backendDir, '.env.example');
  if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
    console.log(`${YELLOW}ℹ Creating backend/.env from backend/.env.example...${RESET}`);
    fs.copyFileSync(backendEnvExample, backendEnv);
  }

  // Ensure frontend/node_modules exists
  const frontendModules = path.join(frontendDir, 'node_modules');
  if (!fs.existsSync(frontendModules)) {
    console.log(`${YELLOW}⚙ Installing frontend dependencies...${RESET}`);
    try {
      await runCommand('npm', ['install'], frontendDir);
    } catch (err) {
      console.error(`${YELLOW}Warning: Frontend npm install failed: ${err.message}${RESET}`);
    }
  }

  // Ensure backend/node_modules exists
  const backendModules = path.join(backendDir, 'node_modules');
  if (!fs.existsSync(backendModules)) {
    console.log(`${YELLOW}⚙ Installing backend dependencies...${RESET}`);
    try {
      await runCommand('npm', ['install'], backendDir);
    } catch (err) {
      console.error(`${YELLOW}Warning: Backend npm install failed: ${err.message}${RESET}`);
    }
  }

  startServices();
}

function printServicesInfo() {
  console.log(`${GREEN}${BOLD}✔ All Systems Ready:${RESET}`);
  console.log(`  ${BLUE}• Frontend (Vite + React):${RESET}     http://localhost:5173`);
  console.log(`  ${MAGENTA}• Backend API (Express):${RESET}       http://localhost:5001/api`);
  console.log(`  ${CYAN}• Database Engine:${RESET}             JSON Store (backend/data/store.json)`);
  console.log(`  ${GREEN}• Security & Access Control:${RESET}   Rate Limiting, Helmet, CORS, JWT Auth, Bcrypt`);
  console.log(`\n${BOLD}🔑 Seed / Demo Accounts:${RESET}`);
  console.log(`  ${GRAY}Student Borrow/Lend:${RESET}  demo@symbiosis.edu  |  Pass: demo123    | OTP: 123456`);
  console.log(`  ${GRAY}Platform Admin:${RESET}       admin@ira.co.in     |  Pass: admin123`);
  console.log(`  ${GRAY}College Portal:${RESET}       Code: 91 58 101 450 001 001 01 2024 2028 | Pass: college123`);
  console.log(`\n${GRAY}Press Ctrl+C to stop both frontend and backend.${RESET}\n`);
}

function prefixStream(stream, prefix, color) {
  let buffer = '';
  stream.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}${prefix}${RESET} ${line}`);
      }
    }
  });
  stream.on('end', () => {
    if (buffer.trim()) {
      console.log(`${color}${prefix}${RESET} ${buffer}`);
    }
  });
}

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      process.kill(-proc.pid, 'SIGTERM');
    }
  } catch (_) {
    try {
      proc.kill('SIGTERM');
    } catch (_) {}
  }
}

function startServices() {
  printServicesInfo();

  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  // Spawn Backend Express server with nodemon
  const backendProc = spawn(npxCmd, ['nodemon', 'server.js'], {
    cwd: backendDir,
    env: { ...process.env, PORT: '5001' },
    detached: !isWindows,
    shell: isWindows,
  });

  prefixStream(backendProc.stdout, '[API]', BLUE);
  prefixStream(backendProc.stderr, '[API ERR]', YELLOW);

  // Spawn Frontend Vite dev server
  const frontendProc = spawn(npxCmd, ['vite'], {
    cwd: frontendDir,
    env: { ...process.env, VITE_API_URL: 'http://localhost:5001' },
    detached: !isWindows,
    shell: isWindows,
  });

  prefixStream(frontendProc.stdout, '[WEB]', GREEN);
  prefixStream(frontendProc.stderr, '[WEB ERR]', YELLOW);

  let cleaningUp = false;
  function cleanup() {
    if (cleaningUp) return;
    cleaningUp = true;
    console.log(`\n${YELLOW}Shutting down IRA platform services...${RESET}`);
    killProcess(backendProc);
    killProcess(frontendProc);
    setTimeout(() => process.exit(0), 500);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  backendProc.on('exit', (code) => {
    if (!cleaningUp && code !== 0 && code !== null) {
      console.log(`${YELLOW}[API] Backend stopped with code ${code}${RESET}`);
    }
  });

  frontendProc.on('exit', (code) => {
    if (!cleaningUp && code !== 0 && code !== null) {
      console.log(`${YELLOW}[WEB] Frontend stopped with code ${code}${RESET}`);
    }
  });
}

banner();
checkEnvironment();
