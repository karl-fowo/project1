const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const binName = (name) => (process.platform === 'win32' ? `${name}.cmd` : name);
const viteBin = path.join(rootDir, 'node_modules', '.bin', binName('vite'));
const tscBin = path.join(rootDir, 'node_modules', '.bin', binName('tsc'));
const electronBin = path.join(rootDir, 'node_modules', '.bin', binName('electron'));
const devUrl = 'http://127.0.0.1:5173';
const mainBuildPath = path.join(rootDir, 'dist', 'main', 'main.js');

let shuttingDown = false;
const children = [];

function spawnProcess(command, args, extraEnv) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (child.spawnfile === electronBin) {
      shutdown(code ?? 0);
      return;
    }

    if (code !== 0 && signal === null) {
      shutdown(code ?? 1);
    }
  });

  return child;
}

function shutdown(code) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(code);
}

function waitForPort(host, port, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }

        setTimeout(attempt, 250);
      });
    };

    attempt();
  });
}

function waitForFile(filePath, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      fs.access(filePath, fs.constants.F_OK, (accessError) => {
        if (!accessError) {
          resolve();
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${filePath}`));
          return;
        }

        setTimeout(attempt, 250);
      });
    };

    attempt();
  });
}

async function main() {
  spawnProcess(tscBin, ['-p', 'tsconfig.node.json', '--watch', '--preserveWatchOutput']);
  spawnProcess(viteBin, ['--host', '127.0.0.1', '--port', '5173', '--strictPort']);

  await Promise.all([
    waitForPort('127.0.0.1', 5173, 30000),
    waitForFile(mainBuildPath, 30000),
  ]);

  spawnProcess(electronBin, ['.'], {
    VITE_DEV_SERVER_URL: devUrl,
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
