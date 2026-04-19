/**
 * editor.js — logic for editor.html (create / edit blog posts).
 * Depends on: js/storage.js
 */

(function () {
  'use strict';

  /* ---- Utility ---- */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
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

  /* ---- Status helper (token-based to avoid stale DOM comparisons) ---- */
  let statusToken = 0;

  function setStatus(msg) {
    const el = qs('#editorStatus');
    if (el) el.textContent = msg;
  }

  function setStatusTimed(msg, delay) {
    const token = ++statusToken;
    setStatus(msg);
    setTimeout(() => { if (statusToken === token) setStatus(''); }, delay);
  }

  /* ---- State ---- */
  let postId      = null;
  let isDirty     = false;
  let autoSaveTimer = null;

  /* ---- Rich Text Editor ---- */
  const editor = qs('#rteContent');

  // Execute a formatting command and re-focus the editor
  function exec(cmd, value) {
    editor.focus();
    document.execCommand(cmd, false, value || null);
    updateToolbarState();
  }

  // Update active states on toolbar buttons
  function updateToolbarState() {
    const commands = {
      'tb-bold':        'bold',
      'tb-italic':      'italic',
      'tb-underline':   'underline',
      'tb-strike':      'strikeThrough',
      'tb-ul':          'insertUnorderedList',
      'tb-ol':          'insertOrderedList',
    };
    for (const [id, cmd] of Object.entries(commands)) {
      const btn = qs('#' + id);
      if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
    }
  }

  editor.addEventListener('keyup',     updateToolbarState);
  editor.addEventListener('mouseup',   updateToolbarState);
  document.addEventListener('selectionchange', updateToolbarState);
  editor.addEventListener('input', () => {
    isDirty = true;
    setStatus('Unsaved changes…');
    scheduleAutoSave();
  });

  /* ---- Toolbar wiring ---- */
  function wire(id, fn) {
    const el = qs('#' + id);
    if (el) el.addEventListener('click', fn);
  }

  wire('tb-bold',       () => exec('bold'));
  wire('tb-italic',     () => exec('italic'));
  wire('tb-underline',  () => exec('underline'));
  wire('tb-strike',     () => exec('strikeThrough'));
  wire('tb-ul',         () => exec('insertUnorderedList'));
  wire('tb-ol',         () => exec('insertOrderedList'));
  wire('tb-quote',      () => exec('formatBlock', 'blockquote'));
  wire('tb-align-l',    () => exec('justifyLeft'));
  wire('tb-align-c',    () => exec('justifyCenter'));
  wire('tb-align-r',    () => exec('justifyRight'));
  wire('tb-removeformat', () => exec('removeFormat'));

  // Heading / paragraph selector
  const headingSelect = qs('#headingSelect');
  if (headingSelect) {
    headingSelect.addEventListener('change', () => {
      exec('formatBlock', headingSelect.value);
      headingSelect.value = '';
      editor.focus();
    });
  }

  // Font size (mapped to heading-like sizes via formatBlock or fontSize)
  // We use a separate select for clarity
  const fontSizeSelect = qs('#fontSizeSelect');
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', () => {
      exec('fontSize', fontSizeSelect.value);
      fontSizeSelect.value = '';
      editor.focus();
    });
  }

  /* ---- Link insertion ---- */
  wire('tb-link', () => {
    const sel = window.getSelection();
    const text = sel && sel.toString().trim();
    showLinkModal(text);
  });

  function showLinkModal(selectedText) {
    const overlay  = qs('#linkModal');
    const urlInput = qs('#linkUrl');
    const txtInput = qs('#linkText');
    txtInput.value = selectedText || '';
    urlInput.value = '';
    overlay.classList.remove('hidden');
    urlInput.focus();

    function cleanup() {
      overlay.classList.add('hidden');
      qs('#linkInsert').onclick = null;
      qs('#linkCancel').onclick = null;
    }

    qs('#linkInsert').onclick = () => {
      const url  = urlInput.value.trim();
      const text = txtInput.value.trim() || url;
      if (url) {
        if (!isSafeUrl(url)) {
          showToast('URL scheme not allowed.', 'error');
          return;
        }
        editor.focus();
        if (!selectedText) {
          const anchor = `<a href="${escAttr(url)}">${escHtml(text)}</a>`;
          exec('insertHTML', anchor);
        } else {
          exec('createLink', url);
        }
        showToast('Link inserted.', 'success');
      }
      cleanup();
    };

    qs('#linkCancel').onclick = cleanup;

    function handleKeydown(e) {
      if (e.key === 'Enter')  { qs('#linkInsert').click(); }
      if (e.key === 'Escape') { cleanup(); }
    }
    urlInput.addEventListener('keydown', handleKeydown);

    const _cleanup = cleanup;
    cleanup = () => {
      urlInput.removeEventListener('keydown', handleKeydown);
      _cleanup();
    };
  }

  /* ---- Image insertion ---- */
  wire('tb-image', () => {
    showImageModal();
  });

  function showImageModal() {
    const overlay  = qs('#imageModal');
    const urlInput = qs('#imageUrl');
    const altInput = qs('#imageAlt');
    const fileInput = qs('#imageFile');
    const preview  = qs('#imagePreview');
    urlInput.value  = '';
    altInput.value  = '';
    fileInput.value = '';
    preview.src     = '';
    preview.classList.add('hidden');
    overlay.classList.remove('hidden');
    urlInput.focus();

    // Preview on URL input — only allow safe schemes
    urlInput.oninput = () => {
      const src = urlInput.value.trim();
      if (src && isSafeUrl(src)) {
        preview.src = src;
        preview.classList.remove('hidden');
      } else {
        preview.src = '';
        preview.classList.add('hidden');
      }
    };

    // File upload → base64 preview
    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        urlInput.value = e.target.result;
        preview.src = e.target.result;
        preview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    };

    function cleanup() {
      overlay.classList.add('hidden');
      qs('#imageInsert').onclick = null;
      qs('#imageCancel').onclick = null;
      urlInput.oninput  = null;
      fileInput.onchange = null;
    }

    qs('#imageInsert').onclick = () => {
      const src = urlInput.value.trim();
      const alt = altInput.value.trim();
      if (src) {
        if (!isSafeUrl(src)) {
          showToast('Image URL scheme not allowed.', 'error');
          return;
        }
        editor.focus();
        exec('insertHTML', `<img src="${escAttr(src)}" alt="${escAttr(alt)}">`);
        showToast('Image inserted.', 'success');
      }
      cleanup();
    };

    qs('#imageCancel').onclick = cleanup;
  }

  /* ---- Auto-save (localStorage draft) ---- */
  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(autoSave, 3000);
  }

  function autoSave() {
    if (!isDirty) return;
    saveDraft();
    setStatusTimed('Draft saved', 2000);
  }

  function saveDraft() {
    const draft = {
      id:      postId,
      title:   qs('#postTitle').value,
      tags:    parseTags(qs('#postTags').value),
      content: editor.innerHTML,
    };
    localStorage.setItem('openblog_draft', JSON.stringify(draft));
  }

  function clearDraft() {
    localStorage.removeItem('openblog_draft');
  }

  /* ---- Save / Publish ---- */
  function buildPost() {
    return {
      id:      postId,
      title:   qs('#postTitle').value.trim(),
      tags:    parseTags(qs('#postTags').value),
      content: editor.innerHTML,
    };
  }

  function parseTags(raw) {
    return raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  function validatePost(post) {
    if (!post.title) {
      showToast('Please add a title.', 'error');
      qs('#postTitle').focus();
      return false;
    }
    if (!editor.textContent.trim()) {
      showToast('Post content cannot be empty.', 'error');
      editor.focus();
      return false;
    }
    return true;
  }

  wire('btnSave', () => {
    const post = buildPost();
    if (!validatePost(post)) return;
    const savedId = BlogStorage.save(post);
    postId   = savedId;
    isDirty  = false;
    clearDraft();
    setStatusTimed('Saved ✓', 2500);
    showToast('Post saved!', 'success');
    // Update URL so a refresh stays on this post
    const newUrl = 'editor.html?id=' + savedId;
    window.history.replaceState({}, '', newUrl);
  });

  wire('btnSaveReturn', () => {
    const post = buildPost();
    if (!validatePost(post)) return;
    BlogStorage.save(post);
    clearDraft();
    isDirty = false;
    window.location.href = 'index.html';
  });

  /* ---- Cancel / discard ---- */
  wire('btnCancel', () => {
    if (!isDirty || window.confirm('Discard unsaved changes?')) {
      clearDraft();
      window.location.href = 'index.html';
    }
  });

  /* ---- Keyboard shortcuts ---- */
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 's') {
      e.preventDefault();
      qs('#btnSave').click();
    }
  });

  /* ---- Load existing post or draft ---- */
  function loadPost(id) {
    const post = BlogStorage.get(id);
    if (!post) {
      showToast('Post not found.', 'error');
      return;
    }
    postId = post.id;
    qs('#postTitle').value   = post.title  || '';
    qs('#postTags').value    = (post.tags  || []).join(', ');
    editor.innerHTML         = post.content || '';
    qs('#pageHeading').textContent = 'Edit Post';
  }

  /* ---- URL safety check ---- */
  function isSafeUrl(url) {
    if (!url) return false;
    // Always allow data: URIs that are image types (produced by FileReader uploads)
    if (/^data:image\//i.test(url)) return true;
    // Parse URL relative to current page so relative paths are resolved correctly
    try {
      const parsed = new URL(url, window.location.href);
      // Allowlist of safe protocols only
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /* ---- Escape helpers ---- */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', () => {
    const id = getParam('id');
    if (id) {
      loadPost(id);
    }
    // Mark dirty on title/tags changes
    qs('#postTitle').addEventListener('input', () => { isDirty = true; scheduleAutoSave(); });
    qs('#postTags').addEventListener('input',  () => { isDirty = true; scheduleAutoSave(); });

    // Prevent accidental navigation away
    window.addEventListener('beforeunload', e => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  });
})();
