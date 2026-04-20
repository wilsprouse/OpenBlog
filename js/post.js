/**
 * post.js — logic for post.html (single post view).
 * Depends on: js/storage.js
 */

(function () {
  'use strict';

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  function showToast(msg, type) {
    let container = qs('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
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

  function renderPost(post) {
    document.title = (post.title || 'Untitled') + ' — OpenBlog';
    qs('#postTitle').textContent   = post.title || 'Untitled';
    qs('#postDate').textContent    = formatDate(post.createdAt);
    if (post.updatedAt && post.updatedAt !== post.createdAt) {
      qs('#postUpdated').textContent = '· Updated ' + formatDate(post.updatedAt);
    }
    qs('#postContent').innerHTML = post.content || '';

    const tags = Array.isArray(post.tags) ? post.tags : [];
    qs('#postTags').innerHTML = tags
      .filter(Boolean)
      .map(t => `<span class="tag">${escHtml(t)}</span>`)
      .join('');
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const id = getParam('id');
    if (!id) {
      qs('#postContent').textContent = 'No post selected.';
      return;
    }

    const post = BlogStorage.get(id);
    if (!post) {
      qs('#postContent').textContent = 'Post not found.';
      return;
    }

    renderPost(post);

    // Edit button
    qs('#btnEdit').addEventListener('click', () => {
      window.location.href = 'editor.html?id=' + id;
    });

    // Delete button
    qs('#btnDelete').addEventListener('click', async () => {
      const ok = await confirm('Delete this post? This cannot be undone.');
      if (ok) {
        BlogStorage.delete(id);
        showToast('Post deleted.', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 900);
      }
    });
  });
})();
