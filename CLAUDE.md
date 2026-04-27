# Grove — CLAUDE.md

Git Repository Dashboard for macOS. Built with Tauri 2, React, TypeScript, shadcn/ui, and Tailwind CSS v4.

---

## Project Structure

```
grove/
├── grove-icon.svg                  # Source SVG for the app icon (regenerate icons with: npm run tauri icon icon-1024.png)
├── src/                            # React frontend
│   ├── App.tsx                     # Root: sidebar, search, bulk actions, auto-refresh, keyboard nav, drag-to-reorder
│   ├── api.ts                      # All Tauri invoke() calls in one place
│   ├── types.ts                    # Shared TS types (RepoStatus, BranchInfo, StashEntry, CommitInfo, TagInfo, RemoteInfo)
│   ├── index.css                   # Tailwind v4 + shadcn theme + Geist font
│   ├── lib/
│   │   ├── utils.ts                # shadcn cn() utility
│   │   ├── time.ts                 # timeAgo() helper
│   │   ├── settings.ts             # loadSettings() / saveSettings() + GroveSettings interface
│   │   ├── ai.ts                   # generateCommitMessage() — Anthropic / OpenAI / Gemini via fetch()
│   │   └── notify.ts               # notify() — wraps send_notification, respects settings toggle
│   └── components/
│       ├── RepoCard.tsx            # Sidebar card per repo (supports drag-and-drop)
│       ├── RepoDetail.tsx          # Main panel — 5 tabs: Changes / History / Stash / Tags / Remotes
│       ├── BranchSwitcher.tsx      # Branch dropdown: list, checkout, create, delete, merge, rebase, force delete
│       ├── CommitHistory.tsx       # Log view with commit diff, revert, cherry-pick
│       ├── StashPanel.tsx          # Stash save, pop, apply, drop
│       ├── TagsPanel.tsx           # List, create, delete tags
│       ├── RemotesPanel.tsx        # List, add, rename, remove remotes
│       ├── FileHistory.tsx         # Per-file commit history modal (git log --follow)
│       ├── GitignoreEditor.tsx     # .gitignore editor modal with quick-add pattern buttons
│       ├── CloneRepo.tsx           # Clone dialog: URL + folder picker, auto-adds cloned repo
│       ├── SettingsPanel.tsx       # Settings modal: refresh interval, scan depth, defaults, notifications
│       ├── GlobalSearch.tsx        # Cmd+K search palette across all repos
│       ├── DiffViewer.tsx          # Syntax-colored diff with word-level highlights
│       ├── LauncherMenu.tsx        # Editor + Terminal + Finder launch buttons
│       ├── SplashScreen.tsx        # Launch splash: logo + name + animated dots, fades after 1.5s
│       ├── DeleteRepoModal.tsx     # Confirm-by-name modal for permanently deleting repo folder from disk
│       ├── UpdateChecker.tsx       # Checks GitHub releases on launch; shows update banner in sidebar footer
│       └── ui/                     # shadcn/ui components
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                 # Entry point
│   │   ├── lib.rs                  # All Tauri commands registered here
│   │   ├── git.rs                  # All git operations via system git CLI
│   │   └── launcher.rs             # Editor/terminal/Finder detection and launch
│   ├── Cargo.toml
│   ├── tauri.conf.json             # Window: 1280x800, titlebar overlay, macOS only; updater endpoint + pubkey
│   └── capabilities/
│       └── default.json            # Tauri v2 permissions
├── .github/
│   └── workflows/
│       ├── deploy-landing.yml      # Landing page deploy
│       └── release.yml             # Build + sign + publish GitHub release on git tag push
├── vite.config.ts                  # Vite + Tailwind v4 plugin + @ alias
└── tsconfig.json                   # Path alias: @/* → src/*
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| App shell | Tauri 2 (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS v4 |
| Font | Geist Variable (`@fontsource-variable/geist`) |
| Icons | react-icons (`react-icons/vsc`, `react-icons/si`) |
| Git ops | System `git` CLI via `std::process::Command` |
| Persistence | `localStorage` (repo paths, settings, order, selected repo, active tab per repo) |
| Auto-update | `tauri-plugin-updater` + `@tauri-apps/plugin-updater` via GitHub Releases |

---

## Running the App

```bash
# Dev mode (first run ~2-3 min, subsequent runs fast)
npm run tauri dev

# Production build
npm run tauri build
```

Rust must be in PATH. Source it if needed:
```bash
source "$HOME/.cargo/env"
```

---

## Implemented Features

### App Shell
- **Splash screen** — logo + "Grove" + animated dots on launch, fades out after 1.5s
- **Grove logo** — displayed in sidebar header next to "Grove" text; source SVG at `grove-icon.svg`
- **Auto-updater** — checks GitHub Releases 3s after launch; shows subtle green banner in sidebar footer with download progress and restart button

### Sidebar
- Add repos: pick a folder (auto-detects if git repo or scans up to N levels deep, controlled by settings)
- **Clone repo** — clone icon opens dialog: URL input + folder picker, auto-adds cloned repo
- Remove repo (hover card → × button)
- **Delete repo from disk** — hover card → trash icon → confirm-by-name modal (GitHub-style) → permanently deletes local folder; remote unaffected
- Repos sorted dirty-first by default; drag to set custom order (persisted)
- **Search** — filter repos by name (appears when > 3 repos)
- **Fetch all** — fetch every repo at once (appears when > 1 repos)
- **Pull all** — pull every repo at once (appears when > 1 repos)
- Auto-refresh configurable (Off / 5s / 10s / 30s / 60s)
- **Keyboard nav** — `↑↓` to navigate repos, `Cmd+R` refresh, `Cmd+K` global search
- **Global search (Cmd+K)** — palette that searches repo name, branch, last commit across all repos
- Footer: total repos, dirty count, filtered count; gear icon → Settings
- **Settings** — refresh interval, scan depth (2–6), default editor/terminal, notifications toggle

### Repo Card (sidebar)
- Repo name, active branch (truncates with ellipsis), dirty/clean dot
- Ahead/behind counts (↑↓)
- Staged / modified / untracked badges
- Last commit: short hash + message + time ago
- Conflict indicator (red !)
- Drag handle for custom order
- Hover → trash icon (delete from disk) + × (remove from Grove) + group tag button

### Repo Detail — Changes tab
- **Staged files** list with checkboxes → Unstage selected
- **Unstaged + untracked files** list with checkboxes → Stage selected / Stage all
- **Discard file** — hover file → × discards that file
- **Discard all** — one click discards all unstaged changes
- **File history** — hover file → clock icon → modal showing all commits that touched that file
- **Diff viewer** — click any file → syntax-colored diff with word-level highlights
- **Commit box** — textarea + Cmd+Enter shortcut
- **Amend last commit** — checkbox pre-fills last commit message, button turns orange
- **Fetch / Pull / Push** buttons with macOS notifications on result
- **Force push** — ▾ chevron on Push → "Force push (--force-with-lease)"
- **Auto push upstream** — if push fails with "no upstream", automatically retries with `git push -u origin <branch>`
- **BranchSwitcher** — click branch → dropdown with:
  - Checkout any local or remote branch
  - Create new branch (`git checkout -b`)
  - Delete branch (safe, `-d`) — hover × button
  - **⋯ context menu per branch**: Merge into current, Rebase onto current, Force delete (`-D`)

### Repo Detail — History tab
- Commit log with graph dots, message, author, time ago
- Select commit → full diff/stat with word-level highlights
- Load last 25 / 50 / 100 / 200 commits
- **⋯ context menu per commit**: Revert (`git revert --no-edit`), Cherry-pick (`git cherry-pick`)

### Repo Detail — Stash tab
- Save stash with optional message
- List all stashes
- Pop latest stash
- Apply stash (keep entry)
- Drop stash (delete entry)

### Repo Detail — Tags tab
- List all tags (sorted by version)
- Create lightweight or annotated tag (name + optional message)
- Delete tag

### Repo Detail — Remotes tab
- List all remotes with fetch URL
- Add remote (name + URL)
- Remove remote
- Rename remote (click name to edit inline)

### Editor, Terminal & Finder Launcher
- Detect installed editors and terminals automatically
- **Editor** dropdown: VS Code, Cursor, Zed, Windsurf, Google Antigravity, Xcode, Sublime Text, IntelliJ IDEA, WebStorm
- **Terminal** dropdown: Warp, iTerm2 (AppleScript auto-cd), Ghostty, Terminal.app, Hyper, Kitty, Alacritty
- Default editor/terminal: set in Settings → clicking the button directly launches it (no dropdown)
- Selecting from dropdown updates the default for that session
- **Finder button** — opens the repo folder in Finder
- Installed apps shown at top, greyed-out uninstalled below

### macOS Notifications
- Native notification after push, pull, fetch, force push, fetch all, pull all, clone
- Toggle in Settings (on by default)

### Window State Persistence
- Last selected repo restored on relaunch
- Last open tab per repo restored on relaunch
- Custom repo order persisted

---

## Architecture Decisions

**Git via system CLI, not a Rust library**
All git operations call the system `git` binary via `std::process::Command`. SSH keys, credentials, `.gitconfig`, and git hooks all work automatically — no re-implementation needed.

**Tauri v2 permissions**
Any new plugin must be added to both `Cargo.toml` (dependency) and `src-tauri/capabilities/default.json` (permission). Without the capability entry, invoke calls silently fail.

**localStorage keys**
| Key | Contents |
|---|---|
| `grove_repos` | `string[]` — repo paths |
| `grove_settings` | `GroveSettings` JSON |
| `grove_selected` | `string` — last selected repo path |
| `grove_order` | `string[]` — custom sidebar order (null = dirty-first) |
| `grove_tab_<path>` | `Tab` string — last open tab per repo |
| `grove_groups` | `{ [path]: groupName }` — repo group assignments |

**AI settings (inside `grove_settings`):**
| Field | Values |
|---|---|
| `aiProvider` | `"anthropic"` \| `"openai"` \| `"gemini"` \| `""` |
| `aiModel` | model id string (e.g. `"claude-sonnet-4-6"`) |
| `aiKey` | API key (stored locally, never sent outside the chosen provider) |

**App detection (launcher.rs)**
Checks four locations in order:
1. `/Applications/<Name>.app`
2. `/System/Applications/<Name>.app`
3. `/System/Applications/Utilities/<Name>.app` ← where Terminal.app lives
4. `~/Applications/<Name>.app`

**RepoDetail tabs**
Five tabs: Changes (default), History, Stash, Tags, Remotes. Tabs are rendered in-place — no routing. Active tab persisted per repo path in localStorage.

**Auto-refresh**
Configurable via Settings: Off, 5s, 10s (default), 30s, 60s. When Off, only manual refresh works.

**Updater**
Uses `tauri-plugin-updater`. On launch (after 3s delay), `UpdateChecker` calls `check()` against the GitHub Releases endpoint. If an update is available, a green banner appears above the sidebar footer. User clicks "Update" → progress bar → "Restart" button. The endpoint and signing pubkey are configured in `tauri.conf.json` under `plugins.updater`.

---

## Tauri Commands Reference

| Command | Description |
|---|---|
| `scan_directory` | Scan folder for git repos (depth from settings, default 4) |
| `add_repo` | Check if a path is a git repo |
| `get_repo_status` | Full status: branch, ahead/behind, staged/unstaged/untracked, last commit |
| `get_multiple_statuses` | Batch status for multiple repos |
| `stage_files` | `git add -- <files>` |
| `unstage_files` | `git restore --staged -- <files>` |
| `discard_file` | `git restore -- <file>` |
| `discard_all` | `git restore .` |
| `commit_changes` | `git commit -m` |
| `amend_commit` | `git commit --amend -m` |
| `push_repo` | `git push` |
| `pull_repo` | `git pull` |
| `fetch_repo` | `git fetch --prune` |
| `fetch_all_repos` | Fetch every repo path provided |
| `pull_all_repos` | Pull every repo path provided |
| `push_force` | `git push --force-with-lease` |
| `push_upstream` | `git push --set-upstream origin <branch>` |
| `get_file_diff` | `git diff [--cached] -- <file>` |
| `list_branches` | `git branch -a` → BranchInfo[] |
| `checkout_branch` | `git checkout <branch>` |
| `create_branch` | `git checkout -b <name>` |
| `delete_branch` | `git branch -d <name>` |
| `force_delete_branch` | `git branch -D <name>` |
| `merge_branch` | `git merge <branch>` |
| `rebase_branch` | `git rebase <branch>` |
| `stash_save` | `git stash push [-m message]` |
| `stash_pop` | `git stash pop` |
| `stash_apply` | `git stash apply stash@{N}` |
| `stash_drop` | `git stash drop stash@{N}` |
| `list_stashes` | `git stash list` → StashEntry[] |
| `get_log` | `git log -N --format=…` → CommitInfo[] |
| `get_commit_diff` | `git show --stat -p <hash>` |
| `get_file_log` | `git log --follow -- <file>` → CommitInfo[] |
| `revert_commit` | `git revert <hash> --no-edit` |
| `cherry_pick` | `git cherry-pick <hash>` |
| `list_tags` | `git tag --sort=-version:refname` → TagInfo[] |
| `create_tag` | `git tag [-a -m] <name>` |
| `delete_tag` | `git tag -d <name>` |
| `list_remotes` | `git remote -v` → RemoteInfo[] |
| `add_remote` | `git remote add <name> <url>` |
| `remove_remote` | `git remote remove <name>` |
| `rename_remote` | `git remote rename <old> <new>` |
| `clone_repo` | `git clone <url> <destination>` |
| `resolve_conflict_ours` | `git checkout --ours -- <file>` + `git add` |
| `resolve_conflict_theirs` | `git checkout --theirs -- <file>` + `git add` |
| `read_gitignore` | Read `.gitignore` content (empty string if missing) |
| `write_gitignore` | Write `.gitignore` content |
| `delete_repo_folder` | `fs::remove_dir_all` — permanently deletes repo folder from disk |
| `send_notification` | Send macOS native notification |
| `pick_folder` | Native macOS folder picker dialog |
| `detect_apps` | Detect installed editors + terminals |
| `open_in_editor` | Open repo in chosen editor |
| `open_in_terminal` | Open repo in chosen terminal |
| `open_in_finder` | Open repo folder in Finder (`open <path>`) |

---

## Adding a New Tauri Command

1. Write the logic in `git.rs` or `launcher.rs`
2. Add a `#[tauri::command]` fn in `lib.rs`
3. Register it in the `generate_handler![]` macro in `lib.rs`
4. Add the corresponding `invoke()` call in `src/api.ts`

---

## Adding a New Editor or Terminal

**Rust (`launcher.rs`):**
- Add an entry to `EDITORS` or `TERMINALS` const array (id, name, cli, app_name)
- Add a `match` arm in `open_in_editor()` or `open_in_terminal()`

**React (`LauncherMenu.tsx`):**
- Add a `case` in `AppIcon` with an SVG or react-icon

---

## Supported Editors

| ID | App | CLI |
|---|---|---|
| `vscode` | VS Code | `code` |
| `cursor` | Cursor | `cursor` |
| `zed` | Zed | `zed` |
| `windsurf` | Windsurf | `windsurf` |
| `antigravity` | Google Antigravity | `agy` |
| `xcode` | Xcode | `xed` |
| `sublime` | Sublime Text | `subl` |
| `idea` | IntelliJ IDEA | — |
| `webstorm` | WebStorm | — |

## Supported Terminals

| ID | App | Notes |
|---|---|---|
| `warp` | Warp | |
| `iterm2` | iTerm2 | Opens via AppleScript, auto-cds into repo |
| `ghostty` | Ghostty | |
| `terminal` | Terminal.app | In `/System/Applications/Utilities/` |
| `hyper` | Hyper | |
| `kitty` | Kitty | |
| `alacritty` | Alacritty | |

---

## Icons

react-icons used where brand icons exist:
- `VscVscode` from `react-icons/vsc`
- `SiWindsurf`, `SiSublimetext`, `SiIntellijidea`, `SiWebstorm`, `SiXcode` from `react-icons/si`
- `SiWarp`, `SiIterm2`, `SiAlacritty`, `SiHyper` from `react-icons/si`

Custom SVGs for: Cursor, Zed, Ghostty, Kitty, Antigravity (not in react-icons).

**App icon:** Source is `grove-icon.svg` (dark green gradient background, white git-branch tree, mint green tip nodes). To regenerate all icon sizes:
```bash
rsvg-convert -w 1024 -h 1024 grove-icon.svg -o icon-1024.png
npm run tauri icon icon-1024.png
rm icon-1024.png
```

---

## Platform

macOS only (by design). Window uses native titlebar overlay (`titleBarStyle: Overlay`).
UI accounts for titlebar height with `padding-top: env(titlebar-area-height, 28px)`.

---

## Releasing Updates

Updates are distributed via **GitHub Releases + Tauri's built-in updater**.

### One-time setup
1. Generate a signing keypair:
   ```bash
   npm run tauri signer generate -- -w ~/.tauri/grove.key
   ```
2. Copy the printed **public key** into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
3. Add two **Repository secrets** on GitHub (`Settings → Secrets → Actions`):
   - `TAURI_SIGNING_PRIVATE_KEY` — contents of `~/.tauri/grove.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — password chosen above

### Publishing a release
```bash
# 1. Bump version in both files:
#    src-tauri/Cargo.toml      → version = "x.y.z"
#    src-tauri/tauri.conf.json → "version": "x.y.z"

# 2. Push a tag — this triggers the release workflow
git tag vX.Y.Z
git push origin vX.Y.Z
```

GitHub Actions (`.github/workflows/release.yml`) builds a universal macOS `.dmg`, signs it, generates `latest.json`, and creates a **draft release**. Review and publish the draft — Grove users get the in-app update banner automatically.

---

## P4 Features

| Feature | Details |
|---|---|
| **Keyboard shortcuts Cmd+Shift+F/L/P** | Fetch / Pull / Push shortcuts in RepoDetail (anywhere except input/textarea). |
| **Conflict resolution UI** | Conflicted files shown in red "Conflicts" section above Staged. "Ours" / "Theirs" buttons per file → `git checkout --ours/--theirs` + `git add`. |
| **Gitignore editor** | `.gitignore` button in RepoDetail header → modal with textarea + quick-add pattern buttons (node_modules, .DS_Store, dist, .env, etc.). |
| **Repo groups** | Collapsible sidebar groups. Hover a repo card → tag button → GroupPicker modal: pick existing group, type new name, or remove. Groups persisted in `grove_groups` localStorage. |
| **AI commit message** | Settings → AI Integration: pick provider (Anthropic/OpenAI/Gemini), model, paste API key. In Changes tab commit box → "AI message" button fetches all staged diffs and generates a conventional commit message. Key stored locally in `grove_settings`. |

## Remaining Ideas (not yet built)

| Feature | Details |
|---|---|
| **Light mode** | Currently hardcoded dark. Would require adding `dark:` Tailwind variants throughout. |
| **Submodule support** | Detect and show submodules in sidebar. |
| **gitignore editor enhancements** | Syntax highlighting, comment toggling. |
| **Anonymous analytics (PostHog)** | Track `app_launched` and key feature usage events with an opt-out toggle in Settings. Use PostHog (free up to 1M events/month, open source). Add only after hitting 100+ downloads — watch GitHub release download counts first (`github.com/LittleBoy9/Grove/releases`). Must include "Share anonymous usage data" toggle in Settings before shipping. |
| **Monetization** | Keep free for v1. Revisit after 500+ active users. Options: GitHub Sponsors (donations), freemium with AI behind a paid plan ($5/mo), or one-time purchase ($9–15) on Mac App Store. |
