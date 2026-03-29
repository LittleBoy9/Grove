<div align="center">

# Grove

### A desktop Git workspace for people managing more than one repo at a time

Grove brings your repositories, changes, history, branches, stash, tags, remotes, and launcher shortcuts into one clean desktop app so your workflow feels organized instead of scattered.

<p>
  <code>Tauri 2</code>
  <code>React 19</code>
  <code>TypeScript</code>
  <code>Rust</code>
  <code>macOS-focused</code>
</p>

</div>

---

## Overview

Grove is built for the moment when your day stops being "one repo, one terminal" and becomes:

- a few active projects
- a couple of hotfix branches
- one repo that is behind
- another with uncommitted changes
- and a third one you just need to fetch, inspect, and open quickly

Instead of bouncing between terminal tabs, Finder windows, and Git tools, Grove gives you one focused workspace to monitor and manage everything from one place.

## Why It Feels Better

<table>
  <tr>
    <td valign="top" width="33%">
      <strong>See everything fast</strong><br />
      Dirty repos rise to the top, branch state is visible immediately, and the latest commit is always in view.
    </td>
    <td valign="top" width="33%">
      <strong>Work without context switching</strong><br />
      Stage, commit, stash, diff, inspect history, manage remotes, and switch branches without leaving the app.
    </td>
    <td valign="top" width="33%">
      <strong>Stay in your own setup</strong><br />
      Grove uses your system Git, your existing credentials, and your preferred editor or terminal.
    </td>
  </tr>
</table>

## At A Glance

| What You Want | What Grove Does |
| --- | --- |
| Find repos that need attention | Sorts dirty repos first and shows change counts, branch info, and ahead/behind state |
| Add a whole workspace quickly | Scans folders and auto-discovers nested Git repositories |
| Move faster across projects | Global search, bulk fetch, bulk pull, drag reorder, and grouping |
| Review changes clearly | File lists, diff viewer, file history, and commit history in one UI |
| Handle real Git work | Stage, unstage, commit, amend, rebase, merge, stash, tag, remote, revert, cherry-pick |
| Open tools instantly | Launch supported editors, terminals, and Finder directly from the repo header |

## Main Features

### Multi-repo workspace

- Add one repo or scan a folder for many
- Auto-refresh repo status on your chosen interval
- Search repos by name, branch, or recent commit
- Group repos by project, team, or client
- Drag repos into your own custom order
- Run fetch-all or pull-all when managing a full workspace

### Full everyday Git workflow

- Stage and unstage selected files
- Discard a file or discard all unstaged changes
- View diffs before committing
- Commit staged changes or amend the latest commit
- Push, pull, fetch, and force-push with lease
- Auto-set upstream when pushing a branch for the first time
- Switch, create, delete, merge, and rebase branches
- Revert commits and cherry-pick from history
- Save, apply, pop, and drop stashes
- Create and remove tags
- Add, rename, and remove remotes
- Resolve conflicts using "ours" or "theirs"
- Edit `.gitignore` without leaving the app

### Built for desktop flow

- Native Tauri desktop app
- macOS notifications for key Git actions
- Direct open actions for editor, terminal, and Finder
- Saved app state for repo list, groups, order, selected repo, and active tab

### Optional AI support

Grove can generate concise commit messages from staged diffs using:

- Anthropic
- OpenAI
- Google Gemini

Your provider, model, and API key stay in local app settings and are only used for the provider you select.

## What The UI Covers

| Area | Experience |
| --- | --- |
| Sidebar | Repo overview, grouping, reorder, scan, clone, fetch-all, pull-all, search |
| Changes | Staging flow, discards, diff viewer, commit box, amend mode, conflict helpers |
| History | Commit list, commit diff, revert, cherry-pick |
| Branching | Switch, create, delete, merge, rebase, upstream push support |
| Stash | Save, apply, pop, and drop |
| Tags | List, create, and delete |
| Remotes | List, add, rename, and remove |
| Utilities | File history, `.gitignore` editor, launcher menu, notifications |

## Getting Started

### Requirements

Make sure you have:

- Node.js and npm
- Rust installed
- `git` available in your PATH
- macOS if you want the full launcher and notification experience exactly as Grove currently implements it

### Install

```bash
npm install
```

### Run In Development

```bash
npm run tauri dev
```

### Build The App

```bash
npm run tauri build
```

If Rust is installed but your shell cannot find it:

```bash
source "$HOME/.cargo/env"
```

## Typical Flow

### 1. Add repositories

Use Grove to:

- add one repository directly, or
- scan a folder and let it discover nested repos automatically

### 2. Check what needs attention

From the sidebar you can quickly see:

- current branch
- ahead or behind count
- staged, modified, and untracked files
- latest commit summary
- conflict indicators

### 3. Work inside the repo

Each repo opens into a focused workspace with:

- Changes
- History
- Stash
- Tags
- Remotes

### 4. Jump into your tools

Grove can detect and launch supported apps such as:

- VS Code
- Cursor
- Zed
- Windsurf
- Xcode
- Sublime Text
- IntelliJ IDEA
- WebStorm
- Warp
- iTerm2
- Ghostty
- Terminal
- Hyper
- Kitty
- Alacritty

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd + K` | Open global search |
| `Cmd + R` | Refresh all repositories |
| `Arrow Up / Arrow Down` | Move through repositories |
| `1` to `5` | Switch repo detail tabs |
| `Cmd + Shift + F` | Fetch current repo |
| `Cmd + Shift + L` | Pull current repo |
| `Cmd + Shift + P` | Push current repo |
| `Cmd + Enter` | Commit from the changes view |

---

## For Developers

The sections below are for contributors and maintainers working on Grove itself.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Native layer | Rust |
| Git integration | System `git` CLI |
| Local persistence | `localStorage` |

## Project Structure

```text
grove/
├── src/                  # React frontend
│   ├── components/       # Repo UI, panels, dialogs, viewers
│   ├── lib/              # Settings, notifications, AI helpers, utilities
│   ├── api.ts            # Tauri invoke wrappers
│   ├── App.tsx           # Main workspace shell
│   └── types.ts          # Shared frontend types
├── src-tauri/            # Rust backend and desktop shell
│   ├── src/git.rs        # Git command execution
│   ├── src/launcher.rs   # Editor, terminal, Finder detection and launch
│   ├── src/lib.rs        # Tauri commands
│   └── tauri.conf.json   # App window and bundle config
└── package.json          # Scripts and dependencies
```

## Development Notes

- Grove executes Git actions through the system `git` binary, so existing SSH keys, credentials, hooks, and Git config keep working.
- App state is stored locally, including repo paths, groups, selected repo, custom order, and settings.
- AI features are optional and the app remains fully usable without them.
- The current launcher and notification experience is clearly macOS-oriented in the implementation.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend only |
| `npm run build` | Build the frontend |
| `npm run preview` | Preview the frontend build |
| `npm run tauri dev` | Run the full desktop app in development |
| `npm run tauri build` | Build the desktop app bundle |

## License

No license has been specified yet.
