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

  cleanLegacyUidNodes();
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