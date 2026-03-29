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
