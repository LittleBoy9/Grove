import { useState, useEffect } from "react";
import { BranchOrigin } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
}

// Deterministic color per branch name
const PALETTE = [
  { dot: "bg-blue-400",   text: "text-blue-400",   border: "border-blue-500/40",   line: "#60a5fa" },
  { dot: "bg-green-400",  text: "text-green-400",  border: "border-green-500/40",  line: "#4ade80" },
  { dot: "bg-purple-400", text: "text-purple-400", border: "border-purple-500/40", line: "#c084fc" },
  { dot: "bg-orange-400", text: "text-orange-400", border: "border-orange-500/40", line: "#fb923c" },
  { dot: "bg-pink-400",   text: "text-pink-400",   border: "border-pink-500/40",   line: "#f472b6" },
  { dot: "bg-cyan-400",   text: "text-cyan-400",   border: "border-cyan-500/40",   line: "#22d3ee" },
  { dot: "bg-yellow-400", text: "text-yellow-400", border: "border-yellow-500/40", line: "#facc15" },
  { dot: "bg-red-400",    text: "text-red-400",    border: "border-red-500/40",    line: "#f87171" },
];

function palette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

// "2024-03-15 10:30:00 +0530" → "Mar 15, 2024 · 10:30"
function fmtDate(raw: string): string {
  const [d, t] = raw.split(" ");
  if (!d) return raw;
  const date = new Date(d + "T00:00:00");
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return t ? `${label} · ${t.slice(0, 5)}` : label;
}

interface TreeNode {
  branch: BranchOrigin;
  children: TreeNode[];
  depth: number;
}

function buildTree(branches: BranchOrigin[]): TreeNode[] {
  const byName = new Map<string, BranchOrigin>();
  for (const b of branches) byName.set(b.branch, b);

  const nodes = new Map<string, TreeNode>();
  for (const b of branches) nodes.set(b.branch, { branch: b, children: [], depth: 0 });

  const roots: TreeNode[] = [];

  for (const b of branches) {
    const node = nodes.get(b.branch)!;
    if (b.created_from && nodes.has(b.created_from)) {
      nodes.get(b.created_from)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Assign depths
  function assignDepth(node: TreeNode, d: number) {
    node.depth = d;
    for (const c of node.children) assignDepth(c, d + 1);
  }
  for (const r of roots) assignDepth(r, 0);

  // Sort children newest first (same order as the flat list)
  function sortChildren(node: TreeNode) {
    node.children.sort((a, b) =>
      (b.branch.created_at ?? "").localeCompare(a.branch.created_at ?? "")
    );
    for (const c of node.children) sortChildren(c);
  }
  for (const r of roots) sortChildren(r);

  return roots;
}

function BranchNode({ node, isLast }: { node: TreeNode; isLast: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const { branch: b, children } = node;
  const p = palette(b.branch);
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-0">
        {/* Tree lines + dot column */}
        <div className="flex flex-col items-center shrink-0" style={{ width: 24 }}>
          {/* Vertical line above dot */}
          <div className="w-px flex-1 bg-white/10" style={{ minHeight: 8 }} />
          {/* Dot */}
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 border-2 border-zinc-900 ${p.dot}`} />
          {/* Vertical line below dot — only if has children or not last */}
          {(hasChildren && expanded) || !isLast
            ? <div className="w-px flex-1 bg-white/10" style={{ minHeight: 8 }} />
            : <div className="flex-1" style={{ minHeight: 8 }} />
          }
        </div>

        {/* Card */}
        <div className="flex-1 mb-1 mt-1 ml-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border ${p.border} hover:bg-white/6 transition-colors`}>
            <span className={`text-xs font-semibold truncate flex-1 ${p.text}`}>{b.branch}</span>

            {b.created_from && (
              <span className="flex items-center gap-1 shrink-0">
                <svg className="w-3 h-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12M6 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0M18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6 9h9a3 3 0 0 1 3 3v3" />
                </svg>
                <span className={`text-[10px] font-medium ${palette(b.created_from).text}`}>{b.created_from}</span>
              </span>
            )}

            {b.created_at && (
              <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">{fmtDate(b.created_at)}</span>
            )}

            {hasChildren && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="ml-1 shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${expanded ? "" : "-rotate-90"}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="flex">
          {/* Indent line */}
          <div className="shrink-0 flex justify-center" style={{ width: 24 }}>
            <div className="w-px bg-white/10 h-full" />
          </div>
          <div className="flex-1 pl-4 border-l border-white/6 ml-3">
            {children.map((child, i) => (
              <BranchNode key={child.branch.branch} node={child} isLast={i === children.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BranchTimeline({ repoPath }: Props) {
  const [branches, setBranches] = useState<BranchOrigin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getBranchTimeline(repoPath)
      .then(setBranches)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [repoPath]);

  if (loading) {
    return (
      <div className="p-6 space-y-3 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-zinc-800 rounded-lg" style={{ marginLeft: (i % 3) * 28 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-zinc-600 text-sm">{error}</div>;
  }

  if (branches.length === 0) {
    return <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No branch history in reflog</div>;
  }

  const filtered = search.trim()
    ? branches.filter((b) =>
        b.branch.toLowerCase().includes(search.toLowerCase()) ||
        (b.created_from ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : branches;

  const roots = buildTree(filtered);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-200">Branch tree</h3>
            <span className="px-1.5 py-0.5 bg-white/6 border border-white/8 rounded text-[10px] text-zinc-500 tabular-nums">
              {branches.length} branches
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">From local reflog · shows creation lineage</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter branches…"
          className="w-full pl-7 pr-3 py-1.5 text-xs bg-white/5 border border-white/8 rounded-lg text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/20"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {roots.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-zinc-600 text-xs">No matches</div>
        ) : (
          <div className="pl-1 pr-1">
            {roots.map((root, i) => (
              <BranchNode key={root.branch.branch} node={root} isLast={i === roots.length - 1} />
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-zinc-700 shrink-0">
        Reflog is local only — branches created on other machines or before this clone may not appear.
      </p>
    </div>
  );
}
