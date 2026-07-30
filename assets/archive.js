(function archivePageRuntime() {
  'use strict';

  function cleanLegacyUidNodes() {
    document.querySelectorAll('.__dsaver_uid__').forEach(node => {
      const authorLink = node.previousElementSibling;
      const inReply = !!node.closest('[id^="reply-p"],#topic-main,.topic-doc,.comment-item,.reply-item,.reply-doc');
      const isProfileLink = authorLink?.matches?.('a[href*="/people/"]');
      if (!inReply || !isProfileLink || !String(authorLink.textContent || '').trim()) node.remove();
    });
  }

  function jump(container) {
    const input = container?.querySelector('[data-floor-input]');
    const value = Number.parseInt(input?.value || '', 10);
    if (!Number.isFinite(value) || value < 1) {
      input?.focus();
      return;
    }
    const total = Number.parseInt(container.dataset.totalPages || '1', 10) || 1;
    const page = Math.min(total, Math.max(1, Math.ceil(value / 100)));
    const localIndex = ((value - 1) % 100) + 1;
    const anchor = `reply-p${String(page).padStart(3, '0')}-n${String(localIndex).padStart(3, '0')}`;
    location.href = `page-${String(page).padStart(3, '0')}.html#${anchor}`;
  }

  function setupPagesToggle() {
    const nav = document.getElementById('__dsaver_archive_nav__');
    if (!nav || nav.dataset.pagesToggleReady === '1') return;
    const pages = Array.from(nav.children).find(node => node.classList?.contains('__dsaver_pages__'));
    if (!pages) return;
    const pageItems = [...pages.querySelectorAll('a,span')]
      .filter(item => /^\d+$/.test(String(item.textContent || '').trim()));
    const total = pageItems.length;
    if (total <= 12) return;

    nav.dataset.pagesToggleReady = '1';
    const current = pages.querySelector('[aria-current="page"],.current')?.textContent?.trim() || '1';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = '__dsaver_pages_toggle__';
    button.setAttribute('aria-expanded', 'false');

    const setButtonText = opened => {
      button.textContent = `页码 ${current}/${total} ${opened ? '▴' : '▾'}`;
    };
    setButtonText(false);
    pages.before(button);

    button.addEventListener('click', event => {
      event.stopPropagation();
      const opened = nav.classList.toggle('__dsaver_pages_open__');
      button.setAttribute('aria-expanded', opened ? 'true' : 'false');
      setButtonText(opened);
    });

    document.addEventListener('click', event => {
      if (nav.contains(event.target)) return;
      nav.classList.remove('__dsaver_pages_open__');
      button.setAttribute('aria-expanded', 'false');
      setButtonText(false);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      nav.classList.remove('__dsaver_pages_open__');
      button.setAttribute('aria-expanded', 'false');
      setButtonText(false);
      button.focus();
    });
  }

  cleanLegacyUidNodes();
  setupPagesToggle();
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-floor-go]');
    if (button) jump(button.closest('.__dsaver_floor_jump__'));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.matches('[data-floor-input]')) {
      jump(event.target.closest('.__dsaver_floor_jump__'));
    }
  });
})();