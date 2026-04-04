<div align="center">

<img src="grove-icon.svg" width="88" height="88" alt="Grove" />

# Grove

A macOS app for managing multiple Git repositories from one place.

[![Platform](https://img.shields.io/badge/platform-macOS-black?style=flat-square&logo=apple)](https://github.com/LittleBoy9/Grove/releases)
[![Built with Tauri](https://img.shields.io/badge/Tauri_2-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[Download](#download) · [Shortcuts](#keyboard-shortcuts) · [Build](#build-from-source)

</div>

---

I built Grove because I was tired of switching between terminal tabs just to check which of my repos had uncommitted changes or was behind. It started as a quick side project and turned into something I actually use every day.

It's a native macOS desktop app. You add your repos, and Grove keeps them all in view — branch, changes, ahead/behind, last commit. Click one and you're in. Stage, commit, push, switch branches, check history, whatever you need.

---

## Download

Grab the latest `.dmg` from the [releases page](https://github.com/LittleBoy9/Grove/releases). Works on Apple Silicon and Intel.

Grove checks for updates automatically and lets you install them without leaving the app.

---

## Screenshots

> Coming soon

---

## What it does

**Sidebar**

The sidebar shows all your repos at once. Dirty ones float to the top. You can see the branch, change counts, ahead/behind state, and the latest commit at a glance. Group repos however you want, drag to reorder, search with `Cmd+K`, or bulk-fetch the whole workspace in one click.

- Scan a folder to auto-discover all nested repos
- Clone directly from the sidebar
- Delete a repo from disk with a confirm-by-name prompt (remote is untouched)
- Star favorites, assign groups, filter by name

**Changes**

Click a repo and you're in the Changes tab. Stage files, write your commit, push. Or discard changes, amend the last commit, resolve conflicts, check what changed in a file across its whole history. It's all there without a terminal.

- Syntax-highlighted diff with word-level highlights
- File history per file (`git log --follow`)
- AI commit message generation using Anthropic, OpenAI, or Gemini (optional, key stays local)
- Force-push with `--force-with-lease`, auto-upstream on first push
- macOS notifications on push / pull / fetch

**Branches**

Switch, create, delete, merge, rebase — all from a dropdown. Force-delete when you need it.

**History**

Browse commits, read the diff, revert or cherry-pick. Load up to 200 commits.

**Stash / Tags / Remotes**

Full stash workflow (save, apply, pop, drop), tag management (lightweight and annotated), and remote management (add, rename, remove) — all in dedicated tabs.

**Launcher**

Detected editors and terminals open from a button in the repo header. Grove finds what's installed and lets you set a default.

Editors: VS Code, Cursor, Zed, Windsurf, Antigravity, Xcode, Sublime Text, IntelliJ IDEA, WebStorm

Terminals: Warp, iTerm2, Ghostty, Terminal.app, Hyper, Kitty, Alacritty

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` | Search across all repos |
| `Cmd+R` | Refresh |
| `↑ / ↓` | Navigate repos |
| `1` – `5` | Switch tabs |
| `Cmd+Shift+F` | Fetch |
| `Cmd+Shift+L` | Pull |
| `Cmd+Shift+P` | Push |
| `Cmd+Enter` | Commit |

---

## Build from Source

You'll need Node.js, Rust, and `git` in your PATH.

```bash
git clone https://github.com/LittleBoy9/Grove.git
cd Grove
npm install
npm run tauri dev
```

If Rust isn't found after installing:

```bash
source "$HOME/.cargo/env"
```

Production build:

```bash
npm run tauri build
```

---

## Stack

Tauri 2 · React 19 · TypeScript · Rust · Tailwind CSS v4 · shadcn/ui

Uses your system `git` binary so SSH keys, credentials, hooks, and config all just work.

---

## Contributing

Issues and PRs are welcome.

---

## License

MIT
