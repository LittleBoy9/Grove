import { RepoStatus } from "../types";

export type FileStatus = "staged" | "modified" | "untracked" | "conflict" | "clean";

export interface FileNode {
  isDir: false;
  name: string;
  path: string;
  status: FileStatus;
}

export interface DirNode {
  isDir: true;
  name: string;
  path: string;
  children: TreeNode[];
  hasChanges: boolean;
  changeCount: number; // total dirty descendants
}

export type TreeNode = FileNode | DirNode;

export function buildTree(paths: string[], repo: RepoStatus): DirNode {
  // Build status lookup maps
  const staged = new Set(repo.staged.map((f) => f.path));
  const conflicts = new Set(
    repo.unstaged.filter((f) => f.status === "conflict").map((f) => f.path)
  );
  const modified = new Set(
    repo.unstaged.filter((f) => f.status !== "conflict").map((f) => f.path)
  );
  const untracked = new Set(repo.untracked.map((f) => f.path));

  function statusOf(path: string): FileStatus {
    if (conflicts.has(path)) return "conflict";
    if (staged.has(path)) return "staged";
    if (modified.has(path)) return "modified";
    if (untracked.has(path)) return "untracked";
    return "clean";
  }

  // Collect all paths — also add any status paths missing from ls-files
  // (e.g. staged deletions that ls-files omits)
  const allPaths = new Set(paths);
  for (const f of [...repo.staged, ...repo.unstaged, ...repo.untracked]) {
    allPaths.add(f.path);
  }

  const root: DirNode = {
    isDir: true,
    name: "",
    path: "",
    children: [],
    hasChanges: false,
    changeCount: 0,
  };

  function getOrCreateDir(parent: DirNode, name: string, path: string): DirNode {
    const existing = parent.children.find(
      (c): c is DirNode => c.isDir && c.name === name
    );
    if (existing) return existing;
    const dir: DirNode = {
      isDir: true,
      name,
      path,
      children: [],
      hasChanges: false,
      changeCount: 0,
    };
    parent.children.push(dir);
    return dir;
  }

  for (const p of allPaths) {
    const parts = p.split("/");
    let current = root;
    // Walk/create intermediate directories
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join("/");
      current = getOrCreateDir(current, parts[i], dirPath);
    }
    // Insert the file node
    const status = statusOf(p);
    current.children.push({
      isDir: false,
      name: parts[parts.length - 1],
      path: p,
      status,
    });
  }

  // Sort: dirs first alphabetically, then files alphabetically
  function sortDir(node: DirNode) {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    for (const child of node.children) {
      if (child.isDir) sortDir(child);
    }
  }

  // Propagate change counts upward
  function propagate(node: DirNode): number {
    let count = 0;
    for (const child of node.children) {
      if (child.isDir) {
        child.changeCount = propagate(child);
        child.hasChanges = child.changeCount > 0;
        count += child.changeCount;
      } else if (child.status !== "clean") {
        count++;
      }
    }
    return count;
  }

  sortDir(root);
  root.changeCount = propagate(root);
  root.hasChanges = root.changeCount > 0;

  return root;
}
