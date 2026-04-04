import { invoke } from "@tauri-apps/api/core";
import { RepoStatus, BranchInfo, CommitInfo, GraphCommitInfo, StashEntry, TagInfo, RemoteInfo, SubmoduleInfo, WorktreeInfo, RepoStats, BranchOrigin } from "./types";

export const api = {
  // Repo discovery
  scanDirectory: (path: string, depth?: number): Promise<string[]> =>
    invoke("scan_directory", { path, depth }),
  addRepo: (path: string): Promise<boolean> =>
    invoke("add_repo", { path }),

  // Status
  getRepoStatus: (path: string): Promise<RepoStatus> =>
    invoke("get_repo_status", { path }),
  getMultipleStatuses: (paths: string[]): Promise<(RepoStatus | string)[]> =>
    invoke("get_multiple_statuses", { paths }),

  // Staging
  stageFiles: (repoPath: string, files: string[]): Promise<void> =>
    invoke("stage_files", { repoPath, files }),
  unstageFiles: (repoPath: string, files: string[]): Promise<void> =>
    invoke("unstage_files", { repoPath, files }),
  discardFile: (repoPath: string, filePath: string): Promise<void> =>
    invoke("discard_file", { repoPath, filePath }),
  discardAll: (repoPath: string): Promise<void> =>
    invoke("discard_all", { repoPath }),

  // Commit
  commitChanges: (repoPath: string, message: string): Promise<string> =>
    invoke("commit_changes", { repoPath, message }),
  amendCommit: (repoPath: string, message: string): Promise<string> =>
    invoke("amend_commit", { repoPath, message }),

  // Remote
  pushUpstream: (repoPath: string, branch: string): Promise<string> =>
    invoke("push_upstream", { repoPath, branch }),
  mergeBranch: (repoPath: string, branch: string): Promise<string> =>
    invoke("merge_branch", { repoPath, branch }),
  rebaseBranch: (repoPath: string, branch: string): Promise<string> =>
    invoke("rebase_branch", { repoPath, branch }),
  revertCommit: (repoPath: string, hash: string): Promise<string> =>
    invoke("revert_commit", { repoPath, hash }),
  cherryPick: (repoPath: string, hash: string): Promise<string> =>
    invoke("cherry_pick", { repoPath, hash }),
  forceDeleteBranch: (repoPath: string, name: string): Promise<void> =>
    invoke("force_delete_branch", { repoPath, name }),
  listTags: (repoPath: string): Promise<TagInfo[]> =>
    invoke("list_tags", { repoPath }),
  createTag: (repoPath: string, name: string, message: string): Promise<void> =>
    invoke("create_tag", { repoPath, name, message }),
  deleteTag: (repoPath: string, name: string): Promise<void> =>
    invoke("delete_tag", { repoPath, name }),
  listRemotes: (repoPath: string): Promise<RemoteInfo[]> =>
    invoke("list_remotes", { repoPath }),
  addRemote: (repoPath: string, name: string, url: string): Promise<void> =>
    invoke("add_remote", { repoPath, name, url }),
  removeRemote: (repoPath: string, name: string): Promise<void> =>
    invoke("remove_remote", { repoPath, name }),
  renameRemote: (repoPath: string, oldName: string, newName: string): Promise<void> =>
    invoke("rename_remote", { repoPath, oldName, newName }),
  pushRepo: (repoPath: string): Promise<string> =>
    invoke("push_repo", { repoPath }),
  pullRepo: (repoPath: string): Promise<string> =>
    invoke("pull_repo", { repoPath }),
  fetchRepo: (repoPath: string): Promise<string> =>
    invoke("fetch_repo", { repoPath }),
  fetchAllRepos: (paths: string[]): Promise<[string, string | null][]> =>
    invoke("fetch_all_repos", { paths }),
  pullAllRepos: (paths: string[]): Promise<[string, string | null][]> =>
    invoke("pull_all_repos", { paths }),

  // Diff
  getFileDiff: (repoPath: string, filePath: string, staged: boolean): Promise<string> =>
    invoke("get_file_diff", { repoPath, filePath, staged }),

  // Branches
  listBranches: (repoPath: string): Promise<BranchInfo[]> =>
    invoke("list_branches", { repoPath }),
  checkoutBranch: (repoPath: string, branch: string): Promise<void> =>
    invoke("checkout_branch", { repoPath, branch }),
  createBranch: (repoPath: string, name: string): Promise<void> =>
    invoke("create_branch", { repoPath, name }),
  deleteBranch: (repoPath: string, name: string): Promise<void> =>
    invoke("delete_branch", { repoPath, name }),

  // Stash
  stashSave: (repoPath: string, message: string): Promise<void> =>
    invoke("stash_save", { repoPath, message }),
  stashPop: (repoPath: string): Promise<void> =>
    invoke("stash_pop", { repoPath }),
  stashApply: (repoPath: string, index: number): Promise<void> =>
    invoke("stash_apply", { repoPath, index }),
  stashDrop: (repoPath: string, index: number): Promise<void> =>
    invoke("stash_drop", { repoPath, index }),
  listStashes: (repoPath: string): Promise<StashEntry[]> =>
    invoke("list_stashes", { repoPath }),

  pushForce: (repoPath: string): Promise<string> =>
    invoke("push_force", { repoPath }),
  cloneRepo: (url: string, destination: string): Promise<string> =>
    invoke("clone_repo", { url, destination }),

  // Log / History
  getLog: (repoPath: string, limit: number): Promise<CommitInfo[]> =>
    invoke("get_log", { repoPath, limit }),
  getLogGraph: (repoPath: string, limit: number): Promise<GraphCommitInfo[]> =>
    invoke("get_log_graph", { repoPath, limit }),
  getCommitDiff: (repoPath: string, hash: string): Promise<string> =>
    invoke("get_commit_diff", { repoPath, hash }),
  getBranchDiff: (repoPath: string, base: string, compare: string): Promise<string> =>
    invoke("get_branch_diff", { repoPath, base, compare }),
  getFileLog: (repoPath: string, filePath: string, limit: number): Promise<CommitInfo[]> =>
    invoke("get_file_log", { repoPath, filePath, limit }),

  // Conflict resolution
  resolveConflictOurs: (repoPath: string, filePath: string): Promise<void> =>
    invoke("resolve_conflict_ours", { repoPath, filePath }),
  resolveConflictTheirs: (repoPath: string, filePath: string): Promise<void> =>
    invoke("resolve_conflict_theirs", { repoPath, filePath }),

  // Gitignore
  readGitignore: (repoPath: string): Promise<string> =>
    invoke("read_gitignore", { repoPath }),
  writeGitignore: (repoPath: string, content: string): Promise<void> =>
    invoke("write_gitignore", { repoPath, content }),
  readFileTree: (repoPath: string): Promise<string[]> =>
    invoke("read_file_tree", { repoPath }),

  // Launcher
  pickFolder: (): Promise<string | null> =>
    invoke("pick_folder"),
  detectApps: (): Promise<{ id: string; name: string; kind: string; installed: boolean }[]> =>
    invoke("detect_apps"),
  openInEditor: (editorId: string, repoPath: string): Promise<void> =>
    invoke("open_in_editor", { editorId, repoPath }),
  openInTerminal: (terminalId: string, repoPath: string): Promise<void> =>
    invoke("open_in_terminal", { terminalId, repoPath }),
  openInFinder: (repoPath: string): Promise<void> =>
    invoke("open_in_finder", { repoPath }),
  openUrl: (url: string): Promise<void> =>
    invoke("open_url", { url }),

  // Stash diff
  stashDiff: (repoPath: string, index: number): Promise<string> =>
    invoke("stash_diff", { repoPath, index }),

  // Submodules
  listSubmodules: (repoPath: string): Promise<SubmoduleInfo[]> =>
    invoke("list_submodules", { repoPath }),
  updateSubmodules: (repoPath: string): Promise<string> =>
    invoke("update_submodules", { repoPath }),

  // Worktrees
  listWorktrees: (repoPath: string): Promise<WorktreeInfo[]> =>
    invoke("list_worktrees", { repoPath }),
  addWorktree: (repoPath: string, path: string, branch: string, createBranch: boolean): Promise<string> =>
    invoke("add_worktree", { repoPath, path, branch, createBranch }),
  removeWorktree: (repoPath: string, wtPath: string): Promise<string> =>
    invoke("remove_worktree", { repoPath, wtPath }),

  // Interactive rebase
  interactiveRebase: (repoPath: string, base: string, instructions: string): Promise<string> =>
    invoke("interactive_rebase", { repoPath, base, instructions }),
  abortRebase: (repoPath: string): Promise<string> =>
    invoke("abort_rebase", { repoPath }),
  isRebasing: (repoPath: string): Promise<boolean> =>
    invoke("is_rebasing", { repoPath }),

  // Repo stats
  getRepoStats: (repoPath: string): Promise<RepoStats> =>
    invoke("get_repo_stats", { repoPath }),

  // Branch timeline
  getBranchTimeline: (repoPath: string): Promise<BranchOrigin[]> =>
    invoke("get_branch_timeline", { repoPath }),

  // Delete repo folder from disk
  deleteRepoFolder: (path: string): Promise<void> =>
    invoke("delete_repo_folder", { path }),

  // Search log
  searchLog: (repoPath: string, query: string, author: string, after: string, before: string, limit: number): Promise<CommitInfo[]> =>
    invoke("search_log", { repoPath, query, author, after, before, limit }),
};
