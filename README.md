# Fut

A fast, no-friction Markdown notes app built with **Electron**. Every note is a
plain Markdown file on disk — no database, no lock-in, no sync service. Your
notes live in a hidden `~/.futnotes/` folder and you can open, edit, or back
them up with any tool you like.

<p align="center"><em>Sidebar of note cards · Markdown editor · live preview — all in resizable panes.</em></p>

## Features

- **Direct filesystem storage** — notes are `.md` files inside `~/.futnotes/`.
- **Three resizable panes** (powered by [Split.js](https://split.js.org/)):
  1. **Sidebar** — every note as a mini-card (title + snippet), click to open.
  2. **Editor** — a full-height Markdown editor.
  3. **Preview** — live-rendered Markdown that updates as you type.
- **Autosave** — every keystroke is persisted to disk (debounced, flushed on blur).
- **Create / rename / delete** — "New Note" prompts for a name and creates
  `name.md`; renaming a note renames the underlying file.
- **Rich Markdown** — headings, lists, tables, code blocks, images and links via
  [markdown-it](https://github.com/markdown-it/markdown-it), with
  [Prism.js](https://prismjs.com/) syntax highlighting.
- **Search** — instant filtering of notes by title, name, or content snippet.
- **Cross-platform packaging** — macOS (`.dmg`/`.zip`), Windows (`.exe` NSIS &
  portable), and Linux (`.AppImage`/`.deb`/`.rpm`) via
  [electron-builder](https://www.electron.build/).

## Project structure

```
Fut/
├── package.json              # scripts + electron-builder config
├── scripts/
│   └── copy-assets.js        # copies vendor libs into src/renderer/vendor
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.js          # app lifecycle, window & menu
│   │   ├── ipc.js            # IPC handlers (safe { ok, data } envelopes)
│   │   └── notesManager.js   # filesystem CRUD for ~/.futnotes
│   ├── preload/
│   │   └── index.js          # contextBridge — the only renderer ↔ main surface
│   └── renderer/             # UI (no Node access)
│       ├── index.html
│       ├── styles/main.css
│       ├── js/
│       │   ├── api.js        # wraps window.fut
│       │   ├── markdown.js   # markdown-it + Prism config
│       │   ├── modal.js      # promise-based prompt modal
│       │   ├── sidebar.js    # note-card list
│       │   ├── editor.js     # editor + autosave
│       │   └── app.js        # orchestrator + Split.js layout
│       └── vendor/           # generated (git-ignored)
├── build/                    # icons & build resources
└── .github/workflows/        # CI + release pipelines
```

## Architecture

- **Main process** (`src/main`) owns the window, native menu, and all disk I/O
  through `NotesManager`. It exposes a small set of IPC handlers that always
  return a serialisable `{ ok, data }` / `{ ok: false, error }` envelope.
- **Preload** (`src/preload`) is the *only* bridge. With `contextIsolation`
  enabled and `nodeIntegration` disabled, it exposes a minimal `window.fut` API.
- **Renderer** (`src/renderer`) is plain, dependency-free ES — each concern
  (sidebar, editor, preview, modal) is its own module attached to a `Fut*`
  namespace, wired together by `app.js`. Vendor libraries are copied out of
  `node_modules` so there is no bundler to configure.

## Getting started

Requires **Node.js 18+**.

```bash
npm install     # installs deps and runs copy-assets (postinstall)
npm start       # launch the app in development
```

## Building distributables

```bash
npm run build         # build for macOS, Windows and Linux (host-permitting)
npm run build:mac     # macOS only  (.dmg / .zip)
npm run build:win     # Windows only (.exe NSIS + portable)
npm run build:linux   # Linux only  (.AppImage / .deb / .rpm)
npm run pack          # unpacked build (fast smoke test, no installers)
```

> Note: each OS's installers are best produced on that OS (or in the CI matrix).
> Building Windows targets from macOS/Linux may require Wine; Linux and the
> unpacked build work everywhere.

Artifacts are written to `dist/`.

## Continuous integration

- **`.github/workflows/ci.yml`** — lints, then runs an unpacked build on Ubuntu,
  macOS and Windows for every push/PR to `main`.
- **`.github/workflows/release.yml`** — on a `v*` tag, packages installers for
  all three platforms with electron-builder and uploads them as artifacts /
  to a GitHub Release.

To cut a release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Where are my notes?

All notes are stored as UTF-8 Markdown files in:

```
~/.futnotes/
```

Use **Open Folder** in the app (or `Ctrl/Cmd+Shift+O`) to reveal it. Because
they are just files, you can version them with git, sync them with any service,
or edit them in another editor — Fut always reflects what is on disk.

## License

[MIT](./LICENSE) © live-by-unix
