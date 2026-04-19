/**
 * app.js — logic for index.html (blog post listing).
 * Depends on: js/storage.js
 */

(function () {
  'use strict';

  /* ---- Helpers ---- */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getExcerpt(html, maxLen) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    const text = div.textContent || '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + '…';
  }

  function showToast(msg, type) {
    const container = qs('.toast-container') || (() => {
      const el = document.createElement('div');
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .3s';
      setTimeout(() => toast.remove(), 350);
    }, 2800);
  }

  /* ---- Confirm dialog ---- */
  function confirm(msg) {
    return new Promise(resolve => {
      const overlay = qs('#confirmOverlay');
      qs('#confirmMsg', overlay).textContent = msg;
      overlay.classList.remove('hidden');

      function cleanup(result) {
        overlay.classList.add('hidden');
        qs('#confirmYes', overlay).onclick = null;
        qs('#confirmNo',  overlay).onclick = null;
        resolve(result);
      }
      qs('#confirmYes', overlay).onclick = () => cleanup(true);
      qs('#confirmNo',  overlay).onclick = () => cleanup(false);
    });
  }

  /* ---- Render ---- */
  let activeTag  = null;
  let searchTerm = '';

  function renderPosts() {
    const grid       = qs('#postsGrid');
    const emptyState = qs('#emptyState');
    let posts = BlogStorage.getAll();

    // Filter by active tag
    if (activeTag) {
      posts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes(activeTag));
    }

    // Filter by search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      posts = posts.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        getExcerpt(p.content, 9999).toLowerCase().includes(q) ||
        (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    if (posts.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      if (BlogStorage.isEmpty()) {
        qs('#emptyMsg').textContent = 'No posts yet. Create your first blog post!';
      } else {
        qs('#emptyMsg').textContent = 'No posts match your search.';
      }
      return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = posts.map(post => buildCard(post)).join('');

    // Attach card event listeners
    qsa('.btn-edit-post', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = 'editor.html?id=' + btn.dataset.id;
      });
    });

    qsa('.btn-delete-post', grid).forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirm('Delete this post? This cannot be undone.');
        if (ok) {
          BlogStorage.delete(btn.dataset.id);
          showToast('Post deleted.', 'success');
          renderPosts();
        }
      });
    });

    qsa('.tag', grid).forEach(tagEl => {
      tagEl.addEventListener('click', () => {
        const t = tagEl.dataset.tag;
        activeTag = activeTag === t ? null : t;
        renderPosts();
      });
    });
  }

  function buildCard(post) {
    const tags  = Array.isArray(post.tags) ? post.tags : [];
    const tagHTML = tags
      .filter(Boolean)
      .map(t => `<span class="tag${activeTag === t ? ' active' : ''}" data-tag="${escHtml(t)}">${escHtml(t)}</span>`)
      .join('');

    const excerpt = escHtml(getExcerpt(post.content, 160));

    return `
      <article class="post-card">
        <div class="post-card-meta">
          <span class="post-card-date">${formatDate(post.createdAt)}</span>
          ${post.updatedAt && post.updatedAt !== post.createdAt
            ? `<span title="Updated ${formatDate(post.updatedAt)}">· edited</span>` : ''}
        </div>
        <h2 class="post-card-title">
          <a href="post.html?id=${post.id}">${escHtml(post.title || 'Untitled')}</a>
        </h2>
        ${excerpt ? `<p class="post-card-excerpt">${excerpt}</p>` : ''}
        <div class="post-card-footer">
          <div class="tags">${tagHTML}</div>
          <div class="post-card-actions">
            <button class="btn btn-sm btn-secondary btn-edit-post" data-id="${post.id}" title="Edit post">
              ✏️ Edit
            </button>
            <button class="btn btn-sm btn-danger btn-delete-post" data-id="${post.id}" title="Delete post">
              🗑 Delete
            </button>
          </div>
        </div>
      </article>`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', () => {
    renderPosts();

    const searchInput = qs('#searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value.trim();
        renderPosts();
      });
    }

    // Clear the active tag filter when clicking anywhere outside a tag or the search input
    document.addEventListener('click', e => {
      if (!e.target.closest('.tag') && !e.target.closest('.search-input')) {
        if (activeTag) {
          activeTag = null;
          renderPosts();
        }
      }
    });
  });
})();
