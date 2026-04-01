export interface FileChange {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "copied" | "conflict" | "changed" | "untracked";
}

export interface CommitInfo {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  timestamp: number;
}

export interface GraphCommitInfo {
  hash: string;
  short_hash: string;
  parents: string[];
  refs: string[];
  message: string;
  author: string;
  timestamp: number;
}

export interface RepoStatus {
  path: string;
  name: string;
  branch: string;
  ahead: number;
  behind: number;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: FileChange[];
  last_commit: CommitInfo | null;
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
  is_remote: boolean;
}

export interface StashEntry {
  index: number;
  message: string;
}

export interface TagInfo {
  name: string;
}

export interface RemoteInfo {
  name: string;
  url: string;
}

export interface SubmoduleInfo {
  path: string;
  name: string;
  commit: string;
  status: "clean" | "modified" | "uninitialized" | "conflict";
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  is_main: boolean;
  is_locked: boolean;
}

export interface AuthorStat {
  name: string;
  commits: number;
}

export interface RepoStats {
  total_commits: number;
  authors: AuthorStat[];
  daily_commits: [string, number][]; // [YYYY-MM-DD, count]
}

export interface BranchOrigin {
  branch: string;
  created_from: string | null;
  created_at: string | null; // "2024-03-15 10:30:00 +0530"
  commit: string;
}
