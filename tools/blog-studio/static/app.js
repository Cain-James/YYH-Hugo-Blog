const app = document.querySelector('#app');

const state = {
  config: null,
  posts: [],
  currentPost: null,
  editor: null,
  dirty: false,
  editorMode: 'split',
  previewUrl: '',
  focusMetaOpen: false,
  selectedFiles: new Set(),
  gitStatus: null,
  commitMessage: 'post: update blog content',
  log: '',
  listRenderFrame: 0,
  scrollFrame: 0,
  scrollResetTimer: 0,
  virtualPosts: [],
  virtualStart: -1,
  virtualEnd: -1,
  virtualRowHeight: 108,
  virtualOverscan: 3,
  virtualFrame: 0,
  postRowCache: new Map(),
  mainScroller: null,
  codeMirrorPromise: null,
  filters: {
    q: '',
    language: 'all',
    category: 'all',
    draft: 'all',
  },
};

const api = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const nestedError = payload.results?.find((item) => item.result?.error)?.result?.error;
      throw new Error(payload.error || nestedError || `Request failed: ${response.status}`);
    }
    return payload;
  },
  config: () => api.request('/api/config'),
  posts: () => api.request('/api/posts'),
  post: (id) => api.request(`/api/posts/${id}`),
  createPost: (payload) => api.request('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  updatePost: (id, payload) => api.request(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  startPreview: () => api.request('/api/hugo/preview/start', { method: 'POST', body: '{}' }),
  stopPreview: () => api.request('/api/hugo/preview/stop', { method: 'POST', body: '{}' }),
  build: () => api.request('/api/hugo/build', { method: 'POST', body: '{}' }),
  gitStatus: () => api.request('/api/git/status'),
  gitDiff: (file) => api.request(`/api/git/diff?file=${encodeURIComponent(file)}`),
  restore: (payload) => api.request('/api/git/restore', { method: 'POST', body: JSON.stringify(payload) }),
  commit: (payload) => api.request('/api/git/commit', { method: 'POST', body: JSON.stringify(payload) }),
  push: () => api.request('/api/git/push', { method: 'POST', body: '{}' }),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message, type = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'error' : ''}`;
  node.textContent = message;
  document.body.append(node);
  setTimeout(() => node.remove(), 4200);
}

function setDirty(dirty) {
  state.dirty = dirty;
  const indicator = document.querySelector('#save-state');
  if (indicator) {
    indicator.textContent = dirty ? '未保存' : '已保存';
    indicator.classList.toggle('dirty', dirty);
  }
}

function teardownEditor() {
  if (!state.editor) return;
  state.editor.toTextArea();
  state.editor = null;
}

function route() {
  const hash = location.hash || '#/posts';
  const [view, id] = hash.slice(2).split('/');
  return { view: view || 'posts', id };
}

function viewFromHash(hash = location.hash || '#/posts') {
  return hash.slice(2).split('/')[0] || 'posts';
}

function setActiveNav(hash = location.hash || '#/posts') {
  const active = viewFromHash(hash);
  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.classList.toggle('active', viewFromHash(button.dataset.nav) === active);
  });
}

function navigate(hash) {
  if (state.dirty && !window.confirm('当前文章有未保存修改，确认离开？')) {
    return;
  }
  setDirty(false);
  setActiveNav(hash);
  if (location.hash === hash) {
    runAction(render);
    return;
  }
  location.hash = hash;
}

function preserveCurrentDraftFromDom() {
  if (!state.currentPost || !document.querySelector('#post-body')) return;
  try {
    const payload = readPostForm();
    state.currentPost = {
      ...state.currentPost,
      frontMatter: payload.frontMatter,
      body: payload.body,
    };
  } catch {
    // Best-effort preservation while switching between edit surfaces.
  }
}

function replaceHashWithoutDirtyPrompt(hash) {
  preserveCurrentDraftFromDom();
  if (location.hash === hash) {
    runAction(render);
    return;
  }
  location.hash = hash;
}

function enterFocusMode() {
  if (!state.currentPost) return;
  replaceHashWithoutDirtyPrompt(`#/focus/${state.currentPost.id}`);
}

function exitFocusMode() {
  if (!state.currentPost) return;
  state.focusMetaOpen = false;
  replaceHashWithoutDirtyPrompt(`#/edit/${state.currentPost.id}`);
}

function toggleFocusMode() {
  const { view } = route();
  if (!state.currentPost || !['edit', 'focus'].includes(view)) return;
  if (view === 'focus') exitFocusMode();
  else enterFocusMode();
}

async function loadConfig() {
  state.config = await api.config();
}

async function loadPosts() {
  const payload = await api.posts();
  state.posts = payload.posts.map((post) => ({
    ...post,
    searchText: `${post.title} ${post.path} ${(post.tags || []).join(' ')}`.toLowerCase(),
  }));
  state.postRowCache.clear();
}

function postMetrics(posts = state.posts) {
  const drafts = posts.filter((post) => post.draft).length;
  const published = posts.length - drafts;
  const zh = posts.filter((post) => post.language === 'zh-cn').length;
  const en = posts.filter((post) => post.language === 'en').length;
  const tags = new Set(posts.flatMap((post) => post.tags || []));
  return { total: posts.length, drafts, published, zh, en, tags: tags.size };
}

function bodyMetrics(body = '') {
  const compact = body.replace(/\s+/g, '');
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return {
    chars: compact.length,
    words,
    minutes: Math.max(1, Math.ceil(compact.length / 500)),
  };
}

function shell(content) {
  teardownEditor();
  const active = route().view;
  const hugo = state.config?.hugo || {};
  const metrics = postMetrics();
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">叶</div>
          <h1>Blog Studio</h1>
          <p>${metrics.total} posts · ${metrics.drafts} drafts</p>
        </div>
        <nav class="nav">
          <button class="${active === 'posts' ? 'active' : ''}" data-nav="#/posts" data-icon="A"><span>01</span>文章</button>
          <button class="${active === 'new' ? 'active' : ''}" data-nav="#/new" data-icon="+"><span>02</span>新建</button>
          <button class="${active === 'publish' ? 'active' : ''}" data-nav="#/publish" data-icon="G"><span>03</span>发布</button>
        </nav>
        <div class="side-metrics">
          <div><strong>${metrics.zh}</strong><span>中文</span></div>
          <div><strong>${metrics.en}</strong><span>英文</span></div>
          <div><strong>${metrics.tags}</strong><span>标签</span></div>
        </div>
        <div class="status-strip">
          <div><span class="dot ${hugo.running ? 'on' : ''}"></span>Hugo ${hugo.running ? '运行中' : '未启动'}</div>
          <div class="repo-path">${escapeHtml(state.config?.repoRoot || '')}</div>
        </div>
      </aside>
      <main class="main view-${escapeHtml(active)}">${content}</main>
    </div>
  `;
  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.nav));
  });
  bindMainScroller();
}

function topbar(title, context, actions = '') {
  return `
    <div class="topbar">
      <div>
        <p class="eyebrow">YYH Hugo Blog</p>
        <h2>${escapeHtml(title)}</h2>
        <p class="subcopy">${escapeHtml(context)}</p>
      </div>
      <div class="toolbar">${actions}</div>
    </div>
  `;
}

function uniqueCategories() {
  const categories = new Set(['tech', 'life']);
  state.posts.forEach((post) => categories.add(post.category));
  return [...categories].sort();
}

function filteredPosts() {
  const q = state.filters.q.trim().toLowerCase();
  return state.posts.filter((post) => {
    return (
      (!q || post.searchText.includes(q)) &&
      (state.filters.language === 'all' || post.language === state.filters.language) &&
      (state.filters.category === 'all' || post.category === state.filters.category) &&
      (state.filters.draft === 'all' || String(post.draft) === state.filters.draft)
    );
  });
}

function postRowMarkup(post, index) {
  const cacheKey = `${post.id}:${post.date}:${post.lastmod}:${post.draft}:${post.title}:${(post.tags || []).join(',')}`;
  const cached = state.postRowCache.get(cacheKey);
  if (cached) {
    return cached.replace('__ROW_INDEX__', String(index % 8));
  }
  const html = `
    <article class="post-row ${post.draft ? 'post-draft' : 'post-published'}" data-edit="${post.id}" style="--row-index: __ROW_INDEX__">
      <div>
        <div class="row-kicker">${escapeHtml(post.language)} / ${escapeHtml(post.category)}</div>
        <div class="post-title">${escapeHtml(post.title)}</div>
        <div class="meta post-path">${escapeHtml(post.path)}</div>
        <div class="tags">${(post.tags || []).length ? (post.tags || []).slice(0, 6).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : '<span class="tag muted-tag">no tags</span>'}</div>
      </div>
      <div class="meta">${escapeHtml(post.date || '未设置日期')}</div>
      <div><span class="badge ${post.draft ? 'draft' : 'published'}">${post.draft ? '草稿' : '发布'}</span></div>
      <button class="row-action button-with-icon" type="button" data-icon="E">编辑</button>
    </article>
  `;
  state.postRowCache.set(cacheKey, html);
  return html.replace('__ROW_INDEX__', String(index % 8));
}

function updateVirtualPostList(force = false) {
  const list = document.querySelector('#post-list');
  if (!list || route().view !== 'posts') return;

  const posts = state.virtualPosts;
  if (!posts.length) {
    state.virtualStart = 0;
    state.virtualEnd = 0;
    list.innerHTML = '<div class="empty">没有匹配的文章。</div>';
    return;
  }

  const scroller = document.querySelector('.main');
  const listRect = list.getBoundingClientRect();
  const scrollerRect = scroller?.getBoundingClientRect();
  const scrollTop = Math.max(0, (scrollerRect?.top || 0) - listRect.top);
  const viewportHeight = scroller?.clientHeight || window.innerHeight || document.documentElement.clientHeight || 720;
  const rowHeight = state.virtualRowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - state.virtualOverscan);
  const end = Math.min(posts.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + state.virtualOverscan);

  if (!force && start === state.virtualStart && end === state.virtualEnd) return;
  state.virtualStart = start;
  state.virtualEnd = end;

  const top = start * rowHeight;
  const bottom = Math.max(0, (posts.length - end) * rowHeight);
  const rows = posts.slice(start, end).map((post, offset) => postRowMarkup(post, start + offset)).join('');
  list.innerHTML = `
    <div class="post-list-spacer" style="height: ${top}px"></div>
    ${rows}
    <div class="post-list-spacer" style="height: ${bottom}px"></div>
  `;

  const measured = list.querySelector('.post-row')?.getBoundingClientRect().height;
  if (measured) {
    const nextHeight = Math.round(measured + 9);
    if (Math.abs(nextHeight - state.virtualRowHeight) > 3) {
      state.virtualRowHeight = nextHeight;
      scheduleVirtualPostListUpdate(true);
    }
  }
}

function scheduleVirtualPostListUpdate(force = false) {
  if (state.virtualFrame) {
    cancelAnimationFrame(state.virtualFrame);
  }
  state.virtualFrame = requestAnimationFrame(() => {
    state.virtualFrame = 0;
    updateVirtualPostList(force);
  });
}

function renderVirtualPostList(posts) {
  state.virtualPosts = posts;
  state.virtualStart = -1;
  state.virtualEnd = -1;
  updateVirtualPostList(true);
}

function bindPostList(list) {
  list.addEventListener('click', (event) => {
    const row = event.target.closest('[data-edit]');
    if (!row || !list.contains(row)) return;
    navigate(`#/edit/${row.dataset.edit}`);
  });
}

function updatePostList() {
  const list = document.querySelector('#post-list');
  if (!list) return;
  if (state.listRenderFrame) {
    cancelAnimationFrame(state.listRenderFrame);
  }
  state.listRenderFrame = requestAnimationFrame(() => {
    state.listRenderFrame = 0;
    renderVirtualPostList(filteredPosts());
  });
}

async function renderPosts() {
  if (!state.posts.length) await loadPosts();
  const posts = filteredPosts();
  const metrics = postMetrics(state.posts);
  shell(`
    ${topbar('文章', `${metrics.total} 篇 · ${metrics.published} 已发布 · ${metrics.drafts} 草稿`, '<button class="button-primary button-with-icon" id="new-post" data-icon="+">新建</button><button class="button-with-icon" id="refresh-posts" data-icon="R">刷新</button>')}
    <section class="overview-grid">
      <div class="metric-tile metric-total"><span>总数</span><strong>${metrics.total}</strong></div>
      <div class="metric-tile metric-draft"><span>草稿</span><strong>${metrics.drafts}</strong></div>
      <div class="metric-tile metric-zh"><span>中文</span><strong>${metrics.zh}</strong></div>
      <div class="metric-tile metric-en"><span>英文</span><strong>${metrics.en}</strong></div>
    </section>
    <div class="filterbar panel-flat">
      <div class="field search-field">
        <label for="filter-q">搜索</label>
        <input id="filter-q" placeholder="标题、标签、路径" value="${escapeHtml(state.filters.q)}">
      </div>
      <div class="field">
        <label for="filter-language">语言</label>
        <select id="filter-language">
          ${['all', 'zh-cn', 'en'].map((value) => `<option value="${value}" ${state.filters.language === value ? 'selected' : ''}>${value === 'all' ? '全部' : value}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="filter-category">栏目</label>
        <select id="filter-category">
          ${['all', ...uniqueCategories()].map((value) => `<option value="${value}" ${state.filters.category === value ? 'selected' : ''}>${value === 'all' ? '全部' : value}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="filter-draft">状态</label>
        <select id="filter-draft">
          <option value="all" ${state.filters.draft === 'all' ? 'selected' : ''}>全部</option>
          <option value="true" ${state.filters.draft === 'true' ? 'selected' : ''}>草稿</option>
          <option value="false" ${state.filters.draft === 'false' ? 'selected' : ''}>发布</option>
        </select>
      </div>
    </div>
    <section class="post-list" id="post-list">
    </section>
  `);

  document.querySelector('#new-post').addEventListener('click', () => navigate('#/new'));
  document.querySelector('#refresh-posts').addEventListener('click', async () => {
    await loadPosts();
    renderPosts();
  });
  const searchInput = document.querySelector('#filter-q');
  let composing = false;
  searchInput.addEventListener('compositionstart', () => {
    composing = true;
  });
  searchInput.addEventListener('compositionend', () => {
    composing = false;
    state.filters.q = searchInput.value;
    updatePostList();
  });
  searchInput.addEventListener('input', () => {
    if (composing) return;
    state.filters.q = searchInput.value;
    updatePostList();
  });
  ['language', 'category', 'draft'].forEach((name) => {
    const input = document.querySelector(`#filter-${name}`);
    input.addEventListener('change', () => {
      state.filters[name] = input.value;
      updatePostList();
    });
  });
  bindPostList(document.querySelector('#post-list'));
  renderVirtualPostList(posts);
}

function installScrollPerformanceMode() {
  window.addEventListener('scroll', handleScrollPerformance, { passive: true });
  window.addEventListener('resize', () => scheduleVirtualPostListUpdate(true), { passive: true });
}

function handleScrollPerformance() {
    if (!state.scrollFrame) {
      state.scrollFrame = requestAnimationFrame(() => {
        state.scrollFrame = 0;
        document.body.classList.add('is-scrolling');
        scheduleVirtualPostListUpdate();
      });
    }
    clearTimeout(state.scrollResetTimer);
    state.scrollResetTimer = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 140);
}

function bindMainScroller() {
  const scroller = document.querySelector('.main');
  if (!scroller || state.mainScroller === scroller) return;
  state.mainScroller = scroller;
  scroller.addEventListener('scroll', handleScrollPerformance, { passive: true });
}

function categoriesFor(language) {
  return state.config?.categories?.[language] || ['tech', 'life'];
}

function readPostForm() {
  const body = state.editor ? state.editor.getValue() : document.querySelector('#post-body').value;
  return {
    frontMatter: {
      ...state.currentPost.frontMatter,
      title: document.querySelector('#fm-title').value,
      date: document.querySelector('#fm-date').value,
      lastmod: document.querySelector('#fm-lastmod').value,
      tags: document.querySelector('#fm-tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
      summary: document.querySelector('#fm-summary').value,
      description: document.querySelector('#fm-description').value,
      slug: document.querySelector('#fm-slug').value,
      draft: document.querySelector('#fm-draft').checked,
      comments: document.querySelector('#fm-comments').checked,
      showToc: document.querySelector('#fm-toc').checked,
      TocOpen: document.querySelector('#fm-toc-open').checked,
    },
    body,
  };
}

function refreshEditor() {
  if (!state.editor) return;
  requestAnimationFrame(() => state.editor.refresh());
}

function updateBodyMetrics(body) {
  const metrics = bodyMetrics(body);
  document.querySelector('#body-chars').textContent = `${metrics.chars} 字符`;
  document.querySelector('#body-words').textContent = `${metrics.words} 词`;
  document.querySelector('#body-minutes').textContent = `${metrics.minutes} 分钟`;
}

function loadStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.append(link);
  });
}

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.append(script);
  });
}

async function ensureCodeMirror() {
  if (window.CodeMirror) return window.CodeMirror;
  if (!state.codeMirrorPromise) {
    state.codeMirrorPromise = (async () => {
      await Promise.all([
        loadStylesheet('/vendor/codemirror/lib/codemirror.css'),
        loadStylesheet('/vendor/codemirror/addon/dialog/dialog.css'),
      ]);
      for (const src of [
        '/vendor/codemirror/lib/codemirror.js',
        '/vendor/codemirror/mode/xml/xml.js',
        '/vendor/codemirror/mode/markdown/markdown.js',
        '/vendor/codemirror/addon/edit/continuelist.js',
        '/vendor/codemirror/addon/edit/closebrackets.js',
        '/vendor/codemirror/addon/edit/matchbrackets.js',
        '/vendor/codemirror/addon/selection/active-line.js',
        '/vendor/codemirror/addon/dialog/dialog.js',
        '/vendor/codemirror/addon/search/searchcursor.js',
        '/vendor/codemirror/addon/search/search.js',
      ]) {
        await loadScript(src);
      }
      return window.CodeMirror;
    })();
  }
  return state.codeMirrorPromise;
}

async function initCodeEditor() {
  const textarea = document.querySelector('#post-body');
  if (!textarea) return;

  try {
    await ensureCodeMirror();
  } catch {
    textarea.classList.add('editor-textarea-fallback');
    textarea.addEventListener('input', (event) => updateBodyMetrics(event.target.value));
    return;
  }

  if (!document.querySelector('#post-body')) return;

  state.editor = window.CodeMirror.fromTextArea(textarea, {
    mode: {
      name: 'markdown',
      highlightFormatting: true,
      taskLists: true,
      strikethrough: true,
      fencedCodeBlockHighlighting: true,
    },
    lineNumbers: true,
    lineWrapping: true,
    styleActiveLine: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    extraKeys: {
      'Enter': 'newlineAndIndentContinueMarkdownList',
      'Ctrl-S': () => runAction(saveCurrentPost),
      'Cmd-S': () => runAction(saveCurrentPost),
      'Ctrl-Shift-F': () => toggleFocusMode(),
      'Cmd-Shift-F': () => toggleFocusMode(),
    },
  });

  state.editor.on('change', (editor) => {
    updateBodyMetrics(editor.getValue());
    setDirty(true);
  });
  refreshEditor();
}

function postForm(post, mode, options = {}) {
  const fm = post.frontMatter || {};
  const metrics = bodyMetrics(post.body || '');
  const previewUrl = state.previewUrl;
  const layoutClass = options.focus ? 'editor-layout focus-editor-layout' : 'editor-layout';
  const writingTitle = options.focus ? '正文' : (mode === 'new' ? '正文模板' : escapeHtml(post.path));
  return `
    <div class="${layoutClass}">
      <section class="panel meta-panel">
        <div class="panel-header">
          <h3>元数据</h3>
          <span class="badge ${state.dirty ? 'dirty' : ''}" id="save-state">${state.dirty ? '未保存' : '已保存'}</span>
        </div>
        <div class="panel-body form-grid">
          <div class="field">
            <label for="fm-title">标题</label>
            <input id="fm-title" value="${escapeHtml(fm.title || '')}">
          </div>
          <div class="inline-grid">
            <div class="field">
              <label for="fm-date">发布日期</label>
              <input id="fm-date" value="${escapeHtml(fm.date || '')}">
            </div>
            <div class="field">
              <label for="fm-lastmod">最后修改</label>
              <input id="fm-lastmod" value="${escapeHtml(fm.lastmod || '')}">
            </div>
          </div>
          <div class="field">
            <label for="fm-tags">标签，英文逗号分隔</label>
            <input id="fm-tags" value="${escapeHtml((fm.tags || []).join(', '))}">
          </div>
          <div class="field">
            <label for="fm-summary">摘要 summary</label>
            <textarea id="fm-summary" rows="3">${escapeHtml(fm.summary || '')}</textarea>
          </div>
          <div class="field">
            <label for="fm-description">描述 description</label>
            <textarea id="fm-description" rows="3">${escapeHtml(fm.description || '')}</textarea>
          </div>
          <div class="field">
            <label for="fm-slug">slug</label>
            <input id="fm-slug" value="${escapeHtml(fm.slug || '')}">
          </div>
          <label class="checkbox-row"><input id="fm-draft" type="checkbox" ${fm.draft ? 'checked' : ''}> 草稿</label>
          <label class="checkbox-row"><input id="fm-comments" type="checkbox" ${fm.comments !== false ? 'checked' : ''}> 评论</label>
          <label class="checkbox-row"><input id="fm-toc" type="checkbox" ${fm.showToc !== false ? 'checked' : ''}> 目录</label>
          <label class="checkbox-row"><input id="fm-toc-open" type="checkbox" ${fm.TocOpen !== false ? 'checked' : ''}> 展开目录</label>
        </div>
      </section>
      <section class="panel writing-panel">
        <div class="panel-header">
          <h3>${writingTitle}</h3>
          <div class="writing-metrics">
            <span id="body-chars">${metrics.chars} 字符</span>
            <span id="body-words">${metrics.words} 词</span>
            <span id="body-minutes">${metrics.minutes} 分钟</span>
          </div>
        </div>
        <div class="editor-tabs" role="group" aria-label="编辑视图">
          <button type="button" class="${state.editorMode === 'edit' ? 'active' : ''}" data-editor-mode="edit">编辑</button>
          <button type="button" class="${state.editorMode === 'split' ? 'active' : ''}" data-editor-mode="split">分屏</button>
          <button type="button" class="${state.editorMode === 'preview' ? 'active' : ''}" data-editor-mode="preview">预览</button>
        </div>
        <div class="panel-body">
          <div class="editor-preview-grid mode-${escapeHtml(state.editorMode)}" id="editor-preview-grid">
            <div class="editor-pane">
              <textarea id="post-body" class="editor-textarea">${escapeHtml(post.body || '')}</textarea>
            </div>
            <div class="render-pane">
              ${
                previewUrl
                  ? `<iframe class="preview-frame" src="${escapeHtml(previewUrl)}"></iframe>`
                  : `<div class="preview-placeholder">
                      <strong>还没有渲染预览</strong>
                      <span>点击顶部“渲染预览”，工具会先保存 Markdown，再启动 Hugo server，并在这里显示接近线上效果的页面。</span>
                    </div>`
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

async function saveCurrentPost() {
  const payload = readPostForm();
  const updated = await api.updatePost(state.currentPost.id, payload);
  state.currentPost = updated.post;
  state.posts = [];
  setDirty(false);
  showToast('文章已保存');
}

async function startPreviewForCurrentPost() {
  await saveCurrentPost();
  const status = await api.startPreview();
  state.config.hugo = status;
  const previewUrl = `${status.url.replace(/\/$/, '')}${state.currentPost.previewPath}`;
  state.previewUrl = previewUrl;
  state.editorMode = 'split';
  showToast('Hugo 预览已启动');
  if (route().view === 'focus') renderFocus(state.currentPost.id, previewUrl);
  else renderEdit(state.currentPost.id, previewUrl);
}

function setEditorMode(mode) {
  state.editorMode = mode;
  document.querySelectorAll('[data-editor-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.editorMode === mode);
  });
  const grid = document.querySelector('#editor-preview-grid');
  if (grid) {
    grid.classList.remove('mode-edit', 'mode-split', 'mode-preview');
    grid.classList.add(`mode-${mode}`);
  }
  refreshEditor();
}

async function renderEdit(id, previewUrl = state.previewUrl) {
  if (!state.currentPost || state.currentPost.id !== id) {
    state.currentPost = (await api.post(id)).post;
    state.previewUrl = '';
    setDirty(false);
  }
  const post = state.currentPost;
  const actions = `
    <button id="back-posts" class="button-with-icon" data-icon="<">返回列表</button>
    <button id="focus-post" class="button-with-icon" data-icon="F">专注写作</button>
    <button id="save-post" class="button-primary button-with-icon" data-icon="S">保存</button>
    <button id="preview-post" class="button-with-icon" data-icon="P">渲染预览</button>
    <button id="build-post" class="button-with-icon" data-icon="B">构建检查</button>
  `;
  shell(`
    ${topbar('编辑', post.path, actions)}
    ${postForm(post, 'edit')}
    ${previewUrl ? `<div class="preview-open-link"><a href="${escapeHtml(previewUrl)}" target="_blank" rel="noreferrer">在新标签打开 Hugo 预览</a></div>` : ''}
  `);
  document.querySelector('#back-posts').addEventListener('click', () => navigate('#/posts'));
  document.querySelector('#focus-post').addEventListener('click', enterFocusMode);
  document.querySelector('#save-post').addEventListener('click', (event) => runAction(saveCurrentPost, event.currentTarget));
  document.querySelector('#preview-post').addEventListener('click', (event) => runAction(startPreviewForCurrentPost, event.currentTarget));
  document.querySelector('#build-post').addEventListener('click', (event) => runAction(async () => {
    await saveCurrentPost();
    const result = await api.build();
    showToast(result.ok ? '构建检查通过' : '构建检查失败', result.ok ? 'info' : 'error');
  }, event.currentTarget));
  initCodeEditor();
  document.querySelectorAll('[data-editor-mode]').forEach((button) => {
    button.addEventListener('click', () => setEditorMode(button.dataset.editorMode));
  });
  document.querySelectorAll('#fm-title, #fm-date, #fm-lastmod, #fm-tags, #fm-summary, #fm-description, #fm-slug, #fm-draft, #fm-comments, #fm-toc, #fm-toc-open').forEach((input) => {
    input.addEventListener('input', () => setDirty(true));
    input.addEventListener('change', () => setDirty(true));
  });
}

async function renderFocus(id, previewUrl = state.previewUrl) {
  teardownEditor();
  if (!state.currentPost || state.currentPost.id !== id) {
    state.currentPost = (await api.post(id)).post;
    state.previewUrl = '';
    setDirty(false);
  }

  const post = state.currentPost;
  const fm = post.frontMatter || {};
  const metrics = bodyMetrics(post.body || '');
  app.innerHTML = `
    <div class="focus-shell ${state.focusMetaOpen ? 'meta-open' : ''}">
      <header class="focus-rail">
        <div class="focus-title">
          <span>Focus Writing</span>
          <strong>${escapeHtml(fm.title || post.path)}</strong>
          <small>${metrics.chars} 字符 · ${metrics.words} 词 · ${metrics.minutes} 分钟</small>
        </div>
        <div class="focus-actions">
          <button id="focus-exit" class="button-with-icon" data-icon="F">退出专注</button>
          <button id="focus-meta-toggle" class="button-with-icon" data-icon="M">元数据</button>
          <button id="focus-save" class="button-primary button-with-icon" data-icon="S">保存</button>
          <button id="focus-preview" class="button-with-icon" data-icon="P">渲染预览</button>
          <button id="focus-build" class="button-with-icon" data-icon="B">构建检查</button>
          ${previewUrl ? `<a class="focus-open-preview" href="${escapeHtml(previewUrl)}" target="_blank" rel="noreferrer">新标签预览</a>` : ''}
        </div>
        <div class="focus-shortcuts">Ctrl/⌘ + Shift + F 进出 · Ctrl/⌘ + S 保存</div>
      </header>
      <main class="focus-main">
        ${postForm(post, 'edit', { focus: true })}
      </main>
      <button class="focus-meta-fab button-with-icon" id="focus-meta-fab" type="button" data-icon="M">元数据</button>
      <button class="focus-scrim" id="focus-scrim" type="button" aria-label="关闭元数据"></button>
    </div>
  `;

  const toggleMeta = (open = !state.focusMetaOpen) => {
    state.focusMetaOpen = open;
    document.querySelector('.focus-shell')?.classList.toggle('meta-open', open);
  };

  document.querySelector('#focus-exit').addEventListener('click', exitFocusMode);
  document.querySelector('#focus-meta-toggle').addEventListener('click', () => toggleMeta());
  document.querySelector('#focus-meta-fab').addEventListener('click', () => toggleMeta(true));
  document.querySelector('#focus-scrim').addEventListener('click', () => toggleMeta(false));
  document.querySelector('#focus-save').addEventListener('click', (event) => runAction(saveCurrentPost, event.currentTarget));
  document.querySelector('#focus-preview').addEventListener('click', (event) => runAction(startPreviewForCurrentPost, event.currentTarget));
  document.querySelector('#focus-build').addEventListener('click', (event) => runAction(async () => {
    await saveCurrentPost();
    const result = await api.build();
    showToast(result.ok ? '构建检查通过' : '构建检查失败', result.ok ? 'info' : 'error');
  }, event.currentTarget));
  initCodeEditor();
  document.querySelectorAll('[data-editor-mode]').forEach((button) => {
    button.addEventListener('click', () => setEditorMode(button.dataset.editorMode));
  });
  document.querySelectorAll('#fm-title, #fm-date, #fm-lastmod, #fm-tags, #fm-summary, #fm-description, #fm-slug, #fm-draft, #fm-comments, #fm-toc, #fm-toc-open').forEach((input) => {
    input.addEventListener('input', () => setDirty(true));
    input.addEventListener('change', () => setDirty(true));
  });
}

async function renderNew() {
  const language = 'zh-cn';
  const categoryOptions = categoriesFor(language);
  shell(`
    ${topbar('新建', 'content/zh-cn/posts/tech', '<button id="cancel-new" class="button-with-icon" data-icon="<">返回列表</button>')}
    <div class="new-layout">
      <section class="panel">
        <div class="panel-header">
          <h3>文章信息</h3>
          <span class="badge">Markdown</span>
        </div>
        <div class="panel-body form-grid">
          <div class="inline-grid">
            <div class="field">
              <label for="new-language">语言</label>
              <select id="new-language">
                ${state.config.languages.map((item) => `<option value="${item}" ${item === language ? 'selected' : ''}>${item}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="new-category">栏目</label>
              <select id="new-category">
                ${categoryOptions.map((item) => `<option value="${item}">${item}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="new-title">标题</label>
            <input id="new-title" autofocus>
          </div>
          <div class="field">
            <label for="new-slug">文件名 / slug</label>
            <input id="new-slug">
          </div>
          <div class="field">
            <label for="new-tags">标签</label>
            <input id="new-tags" placeholder="Hugo, Cloudflare">
          </div>
          <div class="field">
            <label for="new-summary">summary</label>
            <textarea id="new-summary" rows="3"> </textarea>
          </div>
          <div class="field">
            <label for="new-description">description</label>
            <textarea id="new-description" rows="3"> </textarea>
          </div>
          <label class="checkbox-row"><input id="new-draft" type="checkbox"> 草稿</label>
          <div class="toolbar">
            <button id="create-post" class="button-primary button-with-icon" data-icon="+">创建并编辑</button>
          </div>
        </div>
      </section>
      <aside class="draft-aside">
        <div class="draft-path">
          <span>目标路径</span>
          <strong id="new-target-path">content/zh-cn/posts/tech/untitled.md</strong>
        </div>
        <div class="draft-note">
          <span>默认字段</span>
          <strong>comments · toc · reading time</strong>
        </div>
      </aside>
    </div>
  `);
  const syncTargetPath = () => {
    const lang = document.querySelector('#new-language').value;
    const category = document.querySelector('#new-category').value;
    const slug = document.querySelector('#new-slug').value || document.querySelector('#new-title').value || 'untitled';
    document.querySelector('#new-target-path').textContent = `content/${lang}/posts/${category}/${slug}.md`;
  };
  document.querySelector('#new-language').addEventListener('change', (event) => {
    const categorySelect = document.querySelector('#new-category');
    categorySelect.innerHTML = categoriesFor(event.target.value).map((item) => `<option value="${item}">${item}</option>`).join('');
    syncTargetPath();
  });
  document.querySelector('#new-category').addEventListener('change', syncTargetPath);
  document.querySelector('#new-title').addEventListener('input', syncTargetPath);
  document.querySelector('#new-slug').addEventListener('input', syncTargetPath);
  document.querySelector('#cancel-new').addEventListener('click', () => navigate('#/posts'));
  document.querySelector('#create-post').addEventListener('click', () => runAction(async () => {
    const payload = {
      language: document.querySelector('#new-language').value,
      category: document.querySelector('#new-category').value,
      title: document.querySelector('#new-title').value,
      slug: document.querySelector('#new-slug').value,
      tags: document.querySelector('#new-tags').value,
      summary: document.querySelector('#new-summary').value,
      description: document.querySelector('#new-description').value,
      draft: document.querySelector('#new-draft').checked,
    };
    const created = await api.createPost(payload);
    state.posts = [];
    showToast('文章已创建');
    navigate(`#/edit/${created.post.id}`);
  }));
}

function appendLog(title, result) {
  state.log = `${title}\n${JSON.stringify(result, null, 2)}\n\n${state.log}`.slice(0, 20000);
}

function selectedGitFiles() {
  return [...state.selectedFiles];
}

function gitStatusMeta(status) {
  const normalized = String(status || '').trim();
  if (normalized === '??') return { label: '新增', className: 'status-new' };
  if (normalized.includes('D')) return { label: '删除', className: 'status-delete' };
  if (normalized.includes('R')) return { label: '重命名', className: 'status-rename' };
  if (normalized.includes('A')) return { label: '新增', className: 'status-new' };
  if (normalized.includes('M')) return { label: '修改', className: 'status-modified' };
  return { label: normalized || '变更', className: 'status-modified' };
}

function publishMetrics(files) {
  const contentFiles = files.filter((file) => file.file.startsWith('content/')).length;
  const untracked = files.filter((file) => String(file.status).trim() === '??').length;
  return {
    changed: files.length,
    selected: state.selectedFiles.size,
    contentFiles,
    untracked,
  };
}

function diffMarkup(diff) {
  const source = String(diff || '(empty diff)');
  return source.split('\n').map((line) => {
    let className = 'diff-line';
    if (line.startsWith('diff --git')) className += ' diff-file';
    else if (line.startsWith('@@')) className += ' diff-hunk';
    else if (line.startsWith('+') && !line.startsWith('+++')) className += ' diff-add';
    else if (line.startsWith('-') && !line.startsWith('---')) className += ' diff-del';
    else if (line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) className += ' diff-meta';
    return `<div class="${className}">${escapeHtml(line || ' ')}</div>`;
  }).join('');
}

function renderPublishLoading() {
  shell(`
    ${topbar('发布', '正在读取 Git 工作区状态...', '<button id="refresh-git" class="button-with-icon" data-icon="R" disabled>刷新状态</button><button id="run-build" class="button-with-icon" data-icon="B" disabled>构建检查</button>')}
    <section class="overview-grid publish-overview">
      <div class="metric-tile metric-changed skeleton-tile"><span>变更</span><strong>--</strong></div>
      <div class="metric-tile metric-selected skeleton-tile"><span>已选</span><strong>--</strong></div>
      <div class="metric-tile metric-content skeleton-tile"><span>内容文件</span><strong>--</strong></div>
      <div class="metric-tile metric-untracked skeleton-tile"><span>未跟踪</span><strong>--</strong></div>
    </section>
    <div class="publish-grid">
      <section class="panel">
        <div class="panel-header">
          <h3>待处理文件</h3>
          <span class="meta">loading</span>
        </div>
        <div class="panel-body">
          <div class="file-list">
            <div class="file-row skeleton-row"><span></span><span></span><span></span><span></span></div>
            <div class="file-row skeleton-row"><span></span><span></span><span></span><span></span></div>
            <div class="file-row skeleton-row"><span></span><span></span><span></span><span></span></div>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h3>提交与推送</h3>
          <span class="meta">origin main</span>
        </div>
        <div class="panel-body form-grid">
          <div class="empty">正在读取 Git 状态。</div>
        </div>
      </section>
    </div>
  `);
}

async function renderPublish() {
  if (!state.gitStatus) {
    renderPublishLoading();
    try {
      state.gitStatus = await api.gitStatus();
      state.selectedFiles = new Set(
        state.gitStatus.files
          .filter((file) => file.file.startsWith('content/') || file.file.startsWith('static/img/'))
          .map((file) => file.file),
      );
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }
    if (route().view !== 'publish') return;
  }
  const metrics = publishMetrics(state.gitStatus.files);
  shell(`
    ${topbar('发布', `${metrics.changed} 个变更 · ${metrics.selected} 个已选`, '<button id="refresh-git" class="button-with-icon" data-icon="R">刷新状态</button><button id="run-build" class="button-with-icon" data-icon="B">构建检查</button>')}
    <section class="overview-grid publish-overview">
      <div class="metric-tile metric-changed"><span>变更</span><strong>${metrics.changed}</strong></div>
      <div class="metric-tile metric-selected"><span>已选</span><strong id="selected-metric">${metrics.selected}</strong></div>
      <div class="metric-tile metric-content"><span>内容文件</span><strong>${metrics.contentFiles}</strong></div>
      <div class="metric-tile metric-untracked"><span>未跟踪</span><strong>${metrics.untracked}</strong></div>
    </section>
    <div class="publish-grid">
      <section class="panel">
        <div class="panel-header">
          <h3>待处理文件</h3>
          <span class="meta" id="selected-count">${metrics.selected} selected</span>
        </div>
        <div class="panel-body">
          <div class="file-list">
            ${
              state.gitStatus.files.length
                ? state.gitStatus.files.map((file) => {
                    const meta = gitStatusMeta(file.status);
                    return `
                    <div class="file-row ${meta.className} ${state.selectedFiles.has(file.file) ? 'selected' : ''}">
                      <input type="checkbox" data-file="${escapeHtml(file.file)}" ${state.selectedFiles.has(file.file) ? 'checked' : ''}>
                      <span class="badge status-badge">${escapeHtml(meta.label)}</span>
                      <span class="file-name">${escapeHtml(file.file)}</span>
                      <button class="file-action button-with-icon" type="button" data-icon="D" data-diff="${escapeHtml(file.file)}">查看</button>
                    </div>
                  `;
                  }).join('')
                : '<div class="empty">当前没有 Git 变更。</div>'
            }
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h3>提交与推送</h3>
          <span class="meta">origin main</span>
        </div>
        <div class="panel-body form-grid">
          <div class="field">
            <label for="commit-message">Commit message</label>
            <input id="commit-message" value="${escapeHtml(state.commitMessage)}">
          </div>
          <div class="publish-actions">
            <button id="commit-files" class="button-primary button-with-icon" data-icon="C">提交选中文件</button>
            <button id="push-main" class="button-with-icon" data-icon="U">推送 main</button>
          </div>
          <div class="danger-zone">
            <span>危险操作</span>
            <button id="restore-files" class="button-danger button-with-icon" data-icon="!">还原选中文件</button>
          </div>
          <div class="log">${escapeHtml(state.log || '构建、提交和推送结果会显示在这里。')}</div>
        </div>
      </section>
    </div>
    <section class="panel diff-panel">
      <div class="panel-header">
        <h3 id="diff-title">修改详情</h3>
        <span class="meta">git diff</span>
      </div>
      <div class="diff-view diff-empty" id="diff-view">
        <div class="diff-empty-state">
          <strong>选择一个文件查看修改</strong>
          <span>这里会显示 Git 将提交或还原的具体内容。</span>
        </div>
      </div>
    </section>
  `);

  document.querySelector('#refresh-git').addEventListener('click', (event) => runAction(async () => {
    state.gitStatus = await api.gitStatus();
    renderPublish();
  }, event.currentTarget));
  document.querySelector('#run-build').addEventListener('click', (event) => runAction(async () => {
    const result = await api.build();
    appendLog('hugo build', result);
    showToast(result.ok ? '构建检查通过' : '构建检查失败', result.ok ? 'info' : 'error');
    renderPublish();
  }, event.currentTarget));
  document.querySelectorAll('[data-file]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selectedFiles.add(checkbox.dataset.file);
      else state.selectedFiles.delete(checkbox.dataset.file);
      checkbox.closest('.file-row')?.classList.toggle('selected', checkbox.checked);
      document.querySelector('#selected-count').textContent = `${state.selectedFiles.size} selected`;
      document.querySelector('#selected-metric').textContent = String(state.selectedFiles.size);
    });
  });
  document.querySelectorAll('[data-diff]').forEach((button) => {
    button.addEventListener('click', (event) => runAction(async () => {
      const file = button.dataset.diff;
      const result = await api.gitDiff(file);
      document.querySelector('#diff-title').textContent = file;
      const diffView = document.querySelector('#diff-view');
      diffView.classList.remove('diff-empty');
      diffView.innerHTML = diffMarkup(result.diff);
    }, event.currentTarget));
  });
  document.querySelector('#commit-message').addEventListener('input', (event) => {
    state.commitMessage = event.target.value;
  });
  document.querySelector('#commit-files').addEventListener('click', (event) => runAction(async () => {
    const result = await api.commit({
      files: selectedGitFiles(),
      message: state.commitMessage,
    });
    appendLog('git commit', result);
    state.gitStatus = await api.gitStatus();
    showToast(result.ok ? '提交完成' : '提交失败', result.ok ? 'info' : 'error');
    renderPublish();
  }, event.currentTarget));
  document.querySelector('#restore-files').addEventListener('click', (event) => runAction(async () => {
    const files = selectedGitFiles();
    if (!files.length) {
      showToast('没有选中文件', 'error');
      return;
    }
    const confirmed = window.confirm(`确认还原这 ${files.length} 个文件的改动？未跟踪文件会被删除。`);
    if (!confirmed) return;
    const result = await api.restore({ files });
    appendLog('git restore', result);
    state.gitStatus = await api.gitStatus();
    state.selectedFiles = new Set();
    showToast(result.ok ? '已还原选中文件' : '还原失败', result.ok ? 'info' : 'error');
    renderPublish();
  }, event.currentTarget));
  document.querySelector('#push-main').addEventListener('click', (event) => runAction(async () => {
    const result = await api.push();
    appendLog('git push', result);
    showToast(result.ok ? '推送完成' : '推送失败', result.ok ? 'info' : 'error');
    renderPublish();
  }, event.currentTarget));
}

async function runAction(fn, button = null) {
  const originalText = button?.textContent;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = '处理中...';
    }
    await fn();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

async function render() {
  if (!state.config) await loadConfig();
  const { view, id } = route();
  if (view === 'new') return renderNew();
  if (view === 'edit' && id) return renderEdit(id);
  if (view === 'focus' && id) return renderFocus(id);
  if (view === 'publish') return renderPublish();
  return renderPosts();
}

window.addEventListener('hashchange', () => runAction(render));

window.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== 'f') return;
  if (!['edit', 'focus'].includes(route().view)) return;
  event.preventDefault();
  toggleFocusMode();
});

window.addEventListener('beforeunload', (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

installScrollPerformanceMode();

runAction(async () => {
  await loadConfig();
  await loadPosts();
  await render();
});
