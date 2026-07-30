(function siteRuntime() {
  'use strict';
  const input = document.getElementById('site-search');
  const button = document.getElementById('site-search-button');
  const status = document.getElementById('search-status');
  const list = document.getElementById('post-list');
  const results = document.getElementById('fulltext-results');
  const cards = [...document.querySelectorAll('.post-card')];
  const tabs = [...document.querySelectorAll('[data-search-mode]')];
  let mode = 'title';
  let indexPromise = null;
  let timer = null;

  const escapeHtmlRuntime = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function setMode(nextMode) {
    mode = nextMode;
    tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.searchMode === mode));
    input.placeholder = mode === 'title'
      ? '按标题、小组或作者筛选…'
      : '搜索主楼、回复、昵称和标题（至少 2 个字）…';
    list.hidden = mode === 'fulltext';
    results.hidden = mode !== 'fulltext';
    status.textContent = mode === 'title'
      ? '当前按帖子标题、小组和作者筛选。'
      : '全文索引会在第一次搜索时加载；结果按帖子归组。';
    run();
  }

  function titleSearch() {
    const query = normalize(input.value);
    let shown = 0;
    cards.forEach(card => {
      const matched = !query || normalize(card.dataset.haystack).includes(query);
      card.hidden = !matched;
      if (matched) shown += 1;
    });
    status.textContent = query ? `找到 ${shown} 篇帖子。` : `共 ${cards.length} 篇帖子。`;
  }

  async function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('catalog.json', { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error('无法读取 catalog.json');
          return response.json();
        })
        .then(async catalog => {
          const posts = await Promise.all((catalog.posts || []).map(async post => {
            try {
              const response = await fetch(post.searchUrl || `posts/${post.folder}/search.json`, { cache: 'no-store' });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              return { ...post, ...data, records: Array.isArray(data.records) ? data.records.map(record => ({
                ...record,
                url: record.url ? `${post.searchUrl.replace(/search\.json(?:[?#].*)?$/, '')}${record.url}` : post.entryUrl
              })) : [] };
            } catch (error) {
              console.warn('全文索引读取失败:', post.title, error);
              return { ...post, records: [] };
            }
          }));
          return { posts };
        });
    }
    return indexPromise;
  }

  function makeSnippet(text, query) {
    const plain = String(text || '').replace(/\s+/g, ' ').trim();
    const lower = plain.toLowerCase();
    const position = lower.indexOf(query);
    const start = Math.max(0, position - 70);
    const end = Math.min(plain.length, (position < 0 ? 0 : position) + query.length + 110);
    const output = (start ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '');
    const safe = escapeHtmlRuntime(output);
    if (!query) return safe;
    return safe.replace(new RegExp(escapeRegExp(query), 'ig'), match => `<mark>${match}</mark>`);
  }

  async function fulltextSearch() {
    const query = normalize(input.value);
    if (query.length < 2) {
      results.innerHTML = '<div class="empty">请输入至少 2 个字进行全文搜索。</div>';
      status.textContent = '全文搜索至少需要 2 个字。';
      return;
    }

    status.textContent = '正在读取全文索引…';
    try {
      const data = await loadIndex();
      const groups = [];
      let totalMatches = 0;

      for (const post of data.posts || []) {
        const metadata = normalize([post.title, post.groupName, post.authorName].join(' '));
        let hits = (post.records || []).filter(record =>
          normalize([record.author, record.text].join(' ')).includes(query)
        );
        if (metadata.includes(query) && !hits.some(hit => hit.type === 'topic')) {
          hits = [{
            type: 'topic', page: 1, floor: null, anchor: 'topic-main',
            author: post.authorName || '', text: post.title,
            url: `${post.entryUrl}#topic-main`
          }, ...hits];
        }
        if (hits.length) {
          totalMatches += hits.length;
          groups.push({ post, hits });
        }
      }

      status.textContent = `找到 ${groups.length} 篇帖子，包含 ${totalMatches} 条匹配内容。`;
      if (!groups.length) {
        results.innerHTML = '<div class="empty">没有找到匹配内容。</div>';
        return;
      }

      let rendered = 0;
      results.innerHTML = groups.map(({ post, hits }) => {
        const visible = hits.slice(0, 12);
        rendered += visible.length;
        const items = visible.map(hit => {
          const locationText = hit.type === 'topic'
            ? '主楼'
            : (hit.floor ? `第 ${hit.floor} 楼` : `第 ${hit.page} 页`);
          return `<a class="hit" href="${escapeHtmlRuntime(hit.url || post.entryUrl)}">
            <span class="hit-head"><span>${locationText}</span>${hit.author ? `<span>${escapeHtmlRuntime(hit.author)}</span>` : ''}${hit.uid ? `<span>UID：${escapeHtmlRuntime(hit.uid)}</span>` : ''}</span>
            <span class="hit-snippet">${makeSnippet(hit.text, query)}</span>
          </a>`;
        }).join('');
        return `<article class="result-group">
          <h2><a href="${escapeHtmlRuntime(post.entryUrl)}">${escapeHtmlRuntime(post.title)}</a></h2>
          <p class="result-count">${hits.length} 条匹配${hits.length > visible.length ? '，当前显示前 12 条' : ''}</p>
          <div class="hit-list">${items}</div>
        </article>`;
      }).join('');
      if (rendered >= 100) status.textContent += ' 为保证页面流畅，仅优先展示部分结果。';
    } catch (error) {
      console.error(error);
      results.innerHTML = '<div class="empty">全文索引读取失败。请确认各帖子目录中的 search.json 已上传，并通过 Vercel 或本地服务器访问。</div>';
      status.textContent = '全文索引读取失败。';
    }
  }

  function run() {
    clearTimeout(timer);
    timer = setTimeout(() => mode === 'title' ? titleSearch() : fulltextSearch(), 180);
  }

  tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.searchMode)));
  input?.addEventListener('input', run);
  input?.addEventListener('keydown', event => { if (event.key === 'Enter') run(); });
  button?.addEventListener('click', run);
  titleSearch();
})();