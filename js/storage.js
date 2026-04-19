/**
 * BlogStorage — thin wrapper around localStorage for blog post CRUD.
 * Post schema:
 *   { id, title, content (HTML), tags (string[]), createdAt, updatedAt }
 */
const BlogStorage = (() => {
  const KEY = 'openblog_posts';

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch (e) {
      console.error('BlogStorage: failed to parse stored posts', e);
      return [];
    }
  }

  function saveAll(posts) {
    localStorage.setItem(KEY, JSON.stringify(posts));
  }

  return {
    /** Return all posts sorted newest-first. */
    getAll() {
      return loadAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    /** Return a single post by id, or null. */
    get(id) {
      return loadAll().find(p => p.id === id) || null;
    },

    /**
     * Create or update a post.
     * If post.id is falsy, a new post is created and the new id is returned.
     * @returns {string} The saved post's id.
     */
    save(post) {
      const posts = loadAll();
      const now   = new Date().toISOString();
      if (post.id) {
        const idx = posts.findIndex(p => p.id === post.id);
        if (idx >= 0) {
          posts[idx] = { ...posts[idx], ...post, updatedAt: now };
        } else {
          posts.push({ ...post, updatedAt: now, createdAt: now });
        }
        saveAll(posts);
        return post.id;
      } else {
        const newPost = {
          ...post,
          id:        (typeof crypto !== 'undefined' && crypto.randomUUID)
                     ? crypto.randomUUID()
                     : Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
          createdAt: now,
          updatedAt: now,
        };
        posts.push(newPost);
        saveAll(posts);
        return newPost.id;
      }
    },

    /** Delete a post by id. */
    delete(id) {
      saveAll(loadAll().filter(p => p.id !== id));
    },

    /** Return whether any posts exist. */
    isEmpty() {
      return loadAll().length === 0;
    },
  };
})();
