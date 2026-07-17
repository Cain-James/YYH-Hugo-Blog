#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { closeSync, openSync, writeSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const serverPath = path.join(repoRoot, 'tools/blog-studio/server.mjs');
const stateDir = path.join(repoRoot, '.blog-studio');
const pidFile = path.join(stateDir, 'server.pid');
const logFile = path.join(stateDir, 'server.log');

const host = process.env.BLOG_STUDIO_HOST || '127.0.0.1';
const port = Number(process.env.BLOG_STUDIO_PORT || 4177);
const url = `http://${host}:${port}/`;
const command = process.argv[2] || 'open';

async function main() {
  if (!['open', 'start', 'stop', 'restart', 'status'].includes(command)) {
    usage(1);
  }

  if (command === 'start') await start(false);
  if (command === 'open') await start(true);
  if (command === 'stop') await stop();
  if (command === 'restart') {
    await stop({ quietWhenStopped: true });
    await start(true);
  }
  if (command === 'status') await status();
}

async function start(shouldOpen) {
  await mkdir(stateDir, { recursive: true });

  const existing = await readPid();
  if (existing && await isStudioProcess(existing)) {
    console.log(`Blog Studio 已在运行: ${url}`);
    if (shouldOpen) openBrowser(url);
    return;
  }

  await removePidFile();

  const logFd = openSync(logFile, 'a');
  writeSync(logFd, `\n[${new Date().toISOString()}] starting Blog Studio on ${url}\n`);

  const child = spawn(process.execPath, [serverPath], {
    cwd: repoRoot,
    detached: true,
    env: {
      ...process.env,
      BLOG_STUDIO_HOST: host,
      BLOG_STUDIO_PORT: String(port),
    },
    stdio: ['ignore', logFd, logFd],
  });

  child.unref();
  closeSync(logFd);
  await writeFile(pidFile, String(child.pid), 'utf8');

  const ready = await waitForServer();
  if (!ready) {
    console.log(`Blog Studio 正在启动，但暂未响应: ${url}`);
    console.log(`日志: ${path.relative(repoRoot, logFile)}`);
    return;
  }

  console.log(`Blog Studio 已启动: ${url}`);
  if (shouldOpen) openBrowser(url);
}

async function stop(options = {}) {
  const pid = await readPid();
  if (!pid || !await isStudioProcess(pid)) {
    await removePidFile();
    if (!options.quietWhenStopped) console.log('Blog Studio 未在运行。');
    return;
  }

  process.kill(pid, 'SIGTERM');

  const stopped = await waitUntilStopped(pid, 5000);
  if (!stopped) {
    process.kill(pid, 'SIGKILL');
    await waitUntilStopped(pid, 2000);
  }

  await removePidFile();
  console.log('Blog Studio 已关闭。');
}

async function status() {
  const pid = await readPid();
  if (pid && await isStudioProcess(pid)) {
    console.log(`Blog Studio 正在运行。`);
    console.log(`URL: ${url}`);
    console.log(`PID: ${pid}`);
    console.log(`日志: ${path.relative(repoRoot, logFile)}`);
    return;
  }

  await removePidFile();
  console.log('Blog Studio 未在运行。');
}

async function readPid() {
  try {
    const raw = await readFile(pidFile, 'utf8');
    const pid = Number(raw.trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

async function removePidFile() {
  await rm(pidFile, { force: true });
}

async function isStudioProcess(pid) {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }

  // On Linux, avoid stopping an unrelated process if a stale PID was reused.
  if (os.platform() === 'linux') {
    try {
      const cmdline = await readFile(`/proc/${pid}/cmdline`, 'utf8');
      return cmdline.includes('tools/blog-studio/server.mjs') || cmdline.includes('blog-studio/server.mjs');
    } catch {
      return false;
    }
  }

  return true;
}

function waitForServer(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(`${url}api/config`, (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });

      req.on('error', () => {
        if (Date.now() >= deadline) {
          resolve(false);
          return;
        }
        setTimeout(check, 250);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    check();
  });
}

function waitUntilStopped(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    const check = () => {
      if (!isProcessAlive(pid)) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      setTimeout(check, 150);
    };

    check();
  });
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function openBrowser(targetUrl) {
  const platform = os.platform();
  let opener;
  let args;

  if (platform === 'darwin') {
    opener = 'open';
    args = [targetUrl];
  } else if (platform === 'win32') {
    opener = 'cmd';
    args = ['/c', 'start', '', targetUrl];
  } else {
    opener = 'xdg-open';
    args = [targetUrl];
  }

  const child = spawn(opener, args, {
    detached: true,
    stdio: 'ignore',
  });

  child.on('error', () => {
    console.log(`无法自动打开浏览器，请手动访问: ${targetUrl}`);
  });
  child.unref();
}

function usage(exitCode) {
  console.log(`用法:
  npm run studio:open     启动并打开 Blog Studio
  npm run studio:start    仅后台启动 Blog Studio
  npm run studio:stop     关闭 Blog Studio
  npm run studio:restart  重启并打开 Blog Studio
  npm run studio:status   查看运行状态
`);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
