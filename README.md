# OpenBlog

A simple, self-contained blog engine built with **pure HTML and vanilla JavaScript** — no npm, no Node.js, no TypeScript, no build step required.

---

## Features

- **Write blog posts** with a rich-text editor (bold, italic, underline, strikethrough, headings, lists, blockquotes, alignment)
- **Insert images** — upload from your computer (stored as base64) or paste an image URL
- **Insert links** with custom display text
- **Tag your posts** and filter the listing by tag
- **Search posts** by title, content, or tag
- **Edit and delete posts**
- **Auto-save drafts** to localStorage while you write
- All data is stored in the browser's `localStorage` — no backend or database needed
- Fully responsive design

---

## Quick Start

### 1. Install dependencies

```bash
./install.sh
```

This checks that Python 3 is available (required for the dev server) and tries to install it automatically if it's missing.

### 2. Start the app

```bash
./start.sh
```

Open <http://localhost:8080> in your browser.

To use a different port:

```bash
PORT=3000 ./start.sh
```

---

## Project Structure

```
OpenBlog/
├── index.html      — Post listing / home page
├── editor.html     — Create / edit a post
├── post.html       — Single post view
├── css/
│   └── style.css   — All styles
├── js/
│   ├── storage.js  — localStorage CRUD helpers
│   ├── app.js      — Listing page logic
│   ├── editor.js   — Editor page logic
│   └── post.js     — Post view logic
├── install.sh      — Dependency installer
└── start.sh        — Dev server launcher
```

---

## License

MIT © Wil Sprouse
