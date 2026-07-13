import { createServer } from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import net from 'node:net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = __dirname;
const repoRoot = path.resolve(studioRoot, '../..');
const publicRoot = path.join(studioRoot, 'static');
const codeMirrorRoot = path.join(repoRoot, 'node_modules', 'codemirror');

const HOST = process.env.BLOG_STUDIO_HOST || '127.0.0.1';
const PORT = Number(process.env.BLOG_STUDIO_PORT || 4177);
const HUGO_START_PORT = Number(process.env.BLOG_STUDIO_HUGO_PORT || 1313);
const HUGO_BUILD_DIR = process.env.BLOG_STUDIO_BUILD_DIR || '/tmp/hugo-build-check';

const languages = ['zh-cn', 'en'];
const defaultCategories = ['tech', 'life'];
const defaultAuthor = 'ChiAn Ye';
const maxBodyBytes = 8 * 1024 * 1024;

let hugoProcess = null;
let hugoLog = [];
let hugoPort = HUGO_START_PORT;

const knownFrontMatterOrder = [
  'title',
  'date',
  'lastmod',
  'author',
  'categories',
  'tags',
  'summary',
  'description',
  'weight',
  'slug',
  'draft',
  'comments',
  'showToc',
  'TocOpen',
  'hidemeta',
  'disableShare',
  'showbreadcrumbs',
  'DateFormat',
  'ShowWordCounts',
  'ShowWordCount',
  'ShowReadingTime',
  'ShowLastMod',
  'cover',
];

const defaultFrontMatter = {
  title: '',
  date: '',
  lastmod: '',
  author: defaultAuthor,
  categories: [],
  tags: [],
  summary: ' ',
  description: ' ',
  weight: '',
  slug: '',
  draft: false,
  comments: true,
  showToc: true,
  TocOpen: true,
  hidemeta: false,
  disableShare: false,
  showbreadcrumbs: true,
  DateFormat: '2006-01-02',
  ShowWordCounts: true,
  ShowWordCount: true,
  ShowReadingTime: true,
  ShowLastMod: true,
  cover: {
    image: '',
    caption: '',
    alt: '',
    relative: false,
  },
};

function json(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function text(res, status, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function sendFile(req, res, absolutePath, contentType, cacheControl = 'no-cache') {
  const stat = await fs.stat(absolutePath);
  const etag = `W/"${stat.size}-${Math.round(stat.mtimeMs)}"`;

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, {
      etag,
      'cache-control': cacheControl,
    });
    res.end();
    return;
  }

  const body = await fs.readFile(absolutePath);
  res.writeHead(200, {
    'content-type': contentType,
    'content-length': body.length,
    etag,
    'cache-control': cacheControl,
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: 'Not found' });
}

function fail(res, status, message, details) {
  json(res, status, { error: message, details });
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw Object.assign(new Error('Request body is too large'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function encodeId(relativePath) {
  return Buffer.from(relativePath).toString('base64url');
}

function decodeId(id) {
  const relativePath = Buffer.from(id, 'base64url').toString('utf8');
  assertSafeRelativePath(relativePath);
  return relativePath;
}

function assertSafeRelativePath(relativePath) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\0')) {
    throw Object.assign(new Error('Invalid path'), { statusCode: 400 });
  }
  const normalized = path.normalize(relativePath).replaceAll('\\', '/');
  if (normalized.startsWith('../') || normalized === '..') {
    throw Object.assign(new Error('Path escapes repository'), { statusCode: 400 });
  }
  const absolute = path.resolve(repoRoot, normalized);
  const relative = path.relative(repoRoot, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw Object.assign(new Error('Path escapes repository'), { statusCode: 400 });
  }
  return normalized;
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function stripInlineComment(value) {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = value[index - 1];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === '#' && !inSingleQuote && !inDoubleQuote && (index === 0 || /\s/.test(prev))) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value;
}

function parseScalar(rawValue) {
  const value = stripInlineComment(rawValue).trim();
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => parseScalar(item.trim()))
      .filter((item) => item !== '');
  }
  return value;
}

function parseFrontMatter(content) {
  const source = stripBom(content);
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontMatter: {}, body: source };
  }

  const frontMatter = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let currentNestedKey = null;

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const listMatch = line.match(/^\s*-\s*(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(frontMatter[currentKey])) frontMatter[currentKey] = [];
      frontMatter[currentKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const nestedMatch = line.match(/^\s{2,}([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (nestedMatch && currentNestedKey) {
      frontMatter[currentNestedKey][nestedMatch[1]] = parseScalar(nestedMatch[2]);
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyMatch) continue;

    const [, key, rawValue] = keyMatch;
    currentKey = key;
    currentNestedKey = null;

    if (rawValue.trim() === '') {
      frontMatter[key] = [];
      if (key === 'cover') {
        frontMatter[key] = {};
        currentNestedKey = key;
      }
    } else {
      frontMatter[key] = parseScalar(rawValue);
    }
  }

  return {
    frontMatter,
    body: source.slice(match[0].length),
  };
}

function quoteString(value) {
  return JSON.stringify(String(value ?? ''));
}

function serializeValue(key, value) {
  if (Array.isArray(value)) {
    if (!value.length) return `${key}:`;
    return [`${key}:`, ...value.map((item) => `  - ${String(item)}`)].join('\n');
  }
  if (value && typeof value === 'object') {
    const lines = [`${key}:`];
    for (const [childKey, childValue] of Object.entries(value)) {
      lines.push(`    ${childKey}: ${typeof childValue === 'boolean' ? childValue : quoteString(childValue)}`);
    }
    return lines.join('\n');
  }
  if (typeof value === 'boolean') return `${key}: ${value}`;
  if (typeof value === 'number') return `${key}: ${value}`;
  if (value === '') return `${key}:`;
  return `${key}: ${quoteString(value)}`;
}

function serializeFrontMatter(frontMatter, body) {
  const keys = [
    ...knownFrontMatterOrder.filter((key) => Object.hasOwn(frontMatter, key)),
    ...Object.keys(frontMatter).filter((key) => !knownFrontMatterOrder.includes(key)),
  ];
  const yaml = keys.map((key) => serializeValue(key, frontMatter[key])).join('\n');
  return `---\n${yaml}\n---\n\n${body}`;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeLanguage(language) {
  if (!languages.includes(language)) {
    throw Object.assign(new Error('Unsupported language'), { statusCode: 400 });
  }
  return language;
}

function sanitizeSegment(value, fallback = 'untitled') {
  const cleaned = String(value || '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|#%{}^[\]`]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

function nowWithChinaOffset() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const value = formatter.format(new Date()).replace(' ', 'T');
  return `${value}+08:00`;
}

function getLanguageAndCategory(relativePath) {
  const parts = relativePath.split('/');
  return {
    language: parts[1] || '',
    category: parts[3] || '',
  };
}

function buildPreviewPath(post) {
  const baseName = path.basename(post.path, '.md');
  const slug = post.frontMatter.slug || baseName;
  return `/${post.language}/posts/${post.category}/${encodeURIComponent(slug)}/`;
}

async function fileExists(absolutePath) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdown(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdown(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') {
      files.push(absolutePath);
    }
  }
  return files;
}

async function listCategories(language) {
  const postsRoot = path.join(repoRoot, 'content', language, 'posts');
  const entries = await fs.readdir(postsRoot, { withFileTypes: true }).catch(() => []);
  const discovered = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  return [...new Set([...defaultCategories, ...discovered])].sort();
}

async function readPostFromPath(relativePath) {
  const normalized = assertSafeRelativePath(relativePath);
  if (!normalized.match(/^content\/(zh-cn|en)\/posts\/[^/]+\/[^/]+\.md$/)) {
    throw Object.assign(new Error('Path is not a managed post'), { statusCode: 400 });
  }

  const absolutePath = path.join(repoRoot, normalized);
  const content = await fs.readFile(absolutePath, 'utf8');
  const { frontMatter, body } = parseFrontMatter(content);
  const { language, category } = getLanguageAndCategory(normalized);
  const post = {
    id: encodeId(normalized),
    path: normalized,
    language,
    category,
    title: frontMatter.title || path.basename(normalized, '.md'),
    date: frontMatter.date || '',
    lastmod: frontMatter.lastmod || '',
    tags: normalizeTags(frontMatter.tags),
    summary: frontMatter.summary || '',
    description: frontMatter.description || '',
    draft: frontMatter.draft === true,
    frontMatter: { ...defaultFrontMatter, ...frontMatter, tags: normalizeTags(frontMatter.tags) },
    body,
  };
  return { ...post, previewPath: buildPreviewPath(post) };
}

async function listPosts() {
  const posts = [];
  for (const language of languages) {
    const categories = await listCategories(language);
    for (const category of categories) {
      const dir = path.join(repoRoot, 'content', language, 'posts', category);
      const files = await walkMarkdown(dir);
      for (const absolutePath of files) {
        const relativePath = path.relative(repoRoot, absolutePath).replaceAll('\\', '/');
        const post = await readPostFromPath(relativePath);
        posts.push({
          id: post.id,
          path: post.path,
          language: post.language,
          category: post.category,
          title: post.title,
          date: post.date,
          lastmod: post.lastmod,
        tags: post.tags,
        draft: post.draft,
      });
      }
    }
  }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date), 'zh-Hans-CN'));
  return posts;
}

async function createPost(payload) {
  const language = normalizeLanguage(payload.language || 'zh-cn');
  const category = sanitizeSegment(payload.category || 'tech');
  const categories = await listCategories(language);
  if (!categories.includes(category)) {
    throw Object.assign(new Error('Unsupported category'), { statusCode: 400 });
  }

  const title = String(payload.title || '').trim();
  if (!title) throw Object.assign(new Error('Title is required'), { statusCode: 400 });

  const slug = sanitizeSegment(payload.slug || title, `post-${Date.now()}`);
  const relativePath = `content/${language}/posts/${category}/${slug}.md`;
  assertSafeRelativePath(relativePath);
  const absolutePath = path.join(repoRoot, relativePath);
  if (await fileExists(absolutePath)) {
    throw Object.assign(new Error('Post file already exists'), { statusCode: 409 });
  }

  const timestamp = nowWithChinaOffset();
  const frontMatter = {
    ...defaultFrontMatter,
    title,
    date: timestamp,
    lastmod: timestamp,
    tags: normalizeTags(payload.tags),
    summary: payload.summary ?? ' ',
    description: payload.description ?? ' ',
    draft: Boolean(payload.draft),
    slug: payload.slug ? slug : '',
  };
  const body = payload.body || '摘要\n\n<!--more-->\n\n正文\n';
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, serializeFrontMatter(frontMatter, body), 'utf8');
  return readPostFromPath(relativePath);
}

async function updatePost(id, payload) {
  const relativePath = decodeId(id);
  const post = await readPostFromPath(relativePath);
  const frontMatter = {
    ...post.frontMatter,
    ...(payload.frontMatter || {}),
  };
  frontMatter.tags = normalizeTags(frontMatter.tags);
  frontMatter.lastmod = payload.touchLastmod === false ? frontMatter.lastmod : nowWithChinaOffset();
  const body = typeof payload.body === 'string' ? payload.body : post.body;
  await fs.writeFile(path.join(repoRoot, relativePath), serializeFrontMatter(frontMatter, body), 'utf8');
  return readPostFromPath(relativePath);
}

function appendHugoLog(chunk) {
  hugoLog.push(chunk.toString());
  if (hugoLog.length > 160) hugoLog = hugoLog.slice(-160);
}

function getHugoStatus() {
  return {
    running: Boolean(hugoProcess && !hugoProcess.killed),
    port: hugoPort,
    url: `http://127.0.0.1:${hugoPort}/`,
    log: hugoLog.join('').slice(-12000),
  };
}

function canBindPort(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort) {
  for (let offset = 0; offset < 40; offset += 1) {
    const port = startPort + offset;
    if (await canBindPort(port)) return port;
  }
  throw Object.assign(new Error('No available Hugo preview port found'), { statusCode: 503 });
}

function waitForTcpPort(port, processRef, timeoutMs = 7000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      if (processRef.exitCode !== null || processRef.killed) {
        reject(Object.assign(new Error('Hugo preview server exited before it was ready'), { statusCode: 500 }));
        return;
      }

      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(Object.assign(new Error('Timed out waiting for Hugo preview server'), { statusCode: 504 }));
          return;
        }
        setTimeout(tryConnect, 150);
      });
    };

    tryConnect();
  });
}

async function startHugo() {
  if (hugoProcess && !hugoProcess.killed) return getHugoStatus();
  hugoLog = [];
  hugoPort = await findAvailablePort(HUGO_START_PORT);
  hugoProcess = spawn('hugo', [
    'server',
    '-D',
    '--bind',
    '127.0.0.1',
    '--port',
    String(hugoPort),
    '--baseURL',
    `http://127.0.0.1:${hugoPort}/`,
  ], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  hugoProcess.stdout.on('data', appendHugoLog);
  hugoProcess.stderr.on('data', appendHugoLog);
  hugoProcess.on('exit', (code, signal) => {
    appendHugoLog(`\n[hugo exited: code=${code ?? 'null'} signal=${signal ?? 'null'}]\n`);
    hugoProcess = null;
  });
  await waitForTcpPort(hugoPort, hugoProcess);
  return getHugoStatus();
}

function stopHugo() {
  if (hugoProcess && !hugoProcess.killed) {
    hugoProcess.kill('SIGTERM');
  }
  hugoProcess = null;
  return getHugoStatus();
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd: repoRoot, maxBuffer: 12 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        command: [command, ...args].join(' '),
        stdout,
        stderr,
      });
    });
  });
}

async function gitStatus() {
  const result = await runCommand('git', ['status', '--porcelain=v1', '-z'], { encoding: 'buffer' });
  if (!result.ok) return { ...result, files: [] };
  const stdout = result.stdout.toString('utf8');
  const records = stdout.split('\0').filter(Boolean);
  const files = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    const file = record.slice(3);

    files.push({ status, file });

    if (status.includes('R') || status.includes('C')) {
      index += 1;
      if (records[index]) {
        files[files.length - 1].from = records[index];
      }
    }
  }

  return {
    ...result,
    stdout,
    stderr: result.stderr.toString('utf8'),
    files,
  };
}

function normalizeCommitFiles(files) {
  if (!Array.isArray(files) || !files.length) {
    throw Object.assign(new Error('No files selected'), { statusCode: 400 });
  }
  return files.map((file) => assertSafeRelativePath(String(file)));
}

function isUntrackedStatus(status) {
  return String(status || '').trim() === '??';
}

async function getGitFileStatus(file) {
  const status = await gitStatus();
  return status.files.find((item) => item.file === file);
}

function normalizeSingleGitFile(file) {
  return assertSafeRelativePath(String(file || ''));
}

async function readTextPreview(file) {
  const absolutePath = path.join(repoRoot, file);
  const stat = await fs.stat(absolutePath);
  if (stat.size > 300_000) {
    return `[file is ${stat.size} bytes; preview skipped]`;
  }
  return fs.readFile(absolutePath, 'utf8');
}

async function gitFileDiff(file) {
  const normalized = normalizeSingleGitFile(file);
  const fileStatus = await getGitFileStatus(normalized);
  if (!fileStatus) {
    throw Object.assign(new Error('File has no Git changes'), { statusCode: 404 });
  }

  if (isUntrackedStatus(fileStatus.status)) {
    let content = '';
    try {
      content = await readTextPreview(normalized);
    } catch (error) {
      content = `[unable to read file preview: ${error.message}]`;
    }
    return {
      ok: true,
      file: normalized,
      status: fileStatus.status,
      mode: 'untracked',
      diff: `--- /dev/null\n+++ ${normalized}\n${content}`,
    };
  }

  const diff = await runCommand('git', ['-c', 'core.quotePath=false', 'diff', 'HEAD', '--', normalized]);
  return {
    ok: diff.ok,
    file: normalized,
    status: fileStatus.status,
    mode: 'diff',
    diff: diff.stdout || diff.stderr || '(no unstaged diff)',
  };
}

async function restoreGitFiles(files) {
  const normalizedFiles = normalizeCommitFiles(files);
  const status = await gitStatus();
  const tracked = [];
  const untracked = [];

  for (const file of normalizedFiles) {
    const fileStatus = status.files.find((item) => item.file === file);
    if (!fileStatus) continue;
    if (isUntrackedStatus(fileStatus.status)) untracked.push(file);
    else tracked.push(file);
  }

  const results = [];

  if (tracked.length) {
    const restore = await runCommand('git', ['restore', '--', ...tracked]);
    results.push({ step: 'restore', files: tracked, result: restore });
    if (!restore.ok) return { ok: false, results };
  }

  for (const file of untracked) {
    const absolutePath = path.join(repoRoot, file);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (stat?.isDirectory()) {
      return {
        ok: false,
        results: [
          ...results,
          {
            step: 'remove-untracked',
            files: [file],
            result: {
              ok: false,
              error: 'Refusing to remove an untracked directory from Blog Studio. Delete it manually if intended.',
            },
          },
        ],
      };
    }
    await fs.rm(absolutePath, { recursive: true, force: true });
    results.push({ step: 'remove-untracked', files: [file], result: { ok: true } });
  }

  return { ok: true, results };
}

async function commitFiles(payload) {
  const files = normalizeCommitFiles(payload.files);
  const message = String(payload.message || '').trim();
  if (!message) throw Object.assign(new Error('Commit message is required'), { statusCode: 400 });

  const add = await runCommand('git', ['add', '--', ...files]);
  if (!add.ok) return { ok: false, step: 'add', add };
  const commit = await runCommand('git', ['commit', '-m', message]);
  return { ok: commit.ok, step: 'commit', add, commit };
}

async function routeApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/config') {
    const categories = Object.fromEntries(await Promise.all(languages.map(async (language) => [language, await listCategories(language)])));
    return json(res, 200, {
      repoRoot,
      languages,
      categories,
      hugo: getHugoStatus(),
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/posts') {
    return json(res, 200, { posts: await listPosts() });
  }

  if (req.method === 'POST' && url.pathname === '/api/posts') {
    return json(res, 201, { post: await createPost(await readJson(req)) });
  }

  const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && req.method === 'GET') {
    return json(res, 200, { post: await readPostFromPath(decodeId(postMatch[1])) });
  }
  if (postMatch && req.method === 'PUT') {
    return json(res, 200, { post: await updatePost(postMatch[1], await readJson(req)) });
  }

  if (req.method === 'GET' && url.pathname === '/api/hugo/status') {
    return json(res, 200, getHugoStatus());
  }
  if (req.method === 'POST' && url.pathname === '/api/hugo/preview/start') {
    return json(res, 200, await startHugo());
  }
  if (req.method === 'POST' && url.pathname === '/api/hugo/preview/stop') {
    return json(res, 200, stopHugo());
  }
  if (req.method === 'POST' && url.pathname === '/api/hugo/build') {
    const result = await runCommand('hugo', ['--minify', '--destination', HUGO_BUILD_DIR, '--gc', '--cleanDestinationDir']);
    return json(res, result.ok ? 200 : 500, result);
  }

  if (req.method === 'GET' && url.pathname === '/api/git/status') {
    const result = await gitStatus();
    return json(res, result.ok ? 200 : 500, result);
  }
  if (req.method === 'GET' && url.pathname === '/api/git/diff') {
    return json(res, 200, await gitFileDiff(url.searchParams.get('file')));
  }
  if (req.method === 'POST' && url.pathname === '/api/git/restore') {
    const payload = await readJson(req);
    const result = await restoreGitFiles(payload.files);
    return json(res, result.ok ? 200 : 500, result);
  }
  if (req.method === 'POST' && url.pathname === '/api/git/commit') {
    const result = await commitFiles(await readJson(req));
    return json(res, result.ok ? 200 : 500, result);
  }
  if (req.method === 'POST' && url.pathname === '/api/git/push') {
    const result = await runCommand('git', ['push', 'origin', 'main']);
    return json(res, result.ok ? 200 : 500, result);
  }

  return notFound(res);
}

async function serveStatic(req, res, url) {
  if (url.pathname.startsWith('/vendor/codemirror/')) {
    const requestedVendorPath = decodeURIComponent(url.pathname.replace('/vendor/codemirror/', ''));
    const safeVendorPath = path.normalize(requestedVendorPath).replace(/^(\.\.[/\\])+/, '');
    const absoluteVendorPath = path.join(codeMirrorRoot, safeVendorPath);
    const relativeVendorPath = path.relative(codeMirrorRoot, absoluteVendorPath);

    if (relativeVendorPath.startsWith('..') || path.isAbsolute(relativeVendorPath) || !(await fileExists(absoluteVendorPath))) {
      return text(res, 404, 'Not found');
    }

    const ext = path.extname(absoluteVendorPath);
    const vendorTypes = {
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
    };
    return sendFile(req, res, absoluteVendorPath, vendorTypes[ext] || 'application/octet-stream', 'private, max-age=86400, immutable');
  }

  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  let absolutePath = path.join(publicRoot, safePath);

  if (!absolutePath.startsWith(publicRoot)) {
    return text(res, 403, 'Forbidden');
  }

  if (!(await fileExists(absolutePath))) {
    absolutePath = path.join(publicRoot, 'index.html');
  }

  const ext = path.extname(absolutePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
  };
  await sendFile(req, res, absolutePath, contentTypes[ext] || 'application/octet-stream', ext === '.html' ? 'no-cache' : 'private, max-age=0, must-revalidate');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
    if (url.pathname.startsWith('/api/')) {
      await routeApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    const status = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
    fail(res, status, error.message || 'Internal server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Blog Studio: http://${HOST}:${PORT}`);
  console.log(`Repository: ${repoRoot}`);
});

process.on('SIGINT', () => {
  stopHugo();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  stopHugo();
  server.close(() => process.exit(0));
});
