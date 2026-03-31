import { useState, useEffect } from "react";
import { BranchInfo } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
  currentBranch: string;
}

interface FileDiff {
  path: string;
  oldPath: string;
  added: number;
  removed: number;
  rawDiff: string;
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
}

interface DiffLine {
  type: "context" | "added" | "removed" | "hunk" | "meta";
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
  oldTokens?: { text: string; type: "same" | "removed" | "added" }[];
  newTokens?: { text: string; type: "same" | "removed" | "added" }[];
}

function tokenize(line: string): string[] {
  return line.match(/(\w+|\s+|[^\w\s]+)/g) ?? [line];
}

function wordDiff(
  oldLine: string,
  newLine: string
): [
  { text: string; type: "same" | "removed" | "added" }[],
  { text: string; type: "same" | "removed" | "added" }[]
] {
  const oldTokens = tokenize(oldLine.slice(1));
  const newTokens = tokenize(newLine.slice(1));
  const m = oldTokens.length, n = newTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = oldTokens[i] === newTokens[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const oldResult: { text: string; type: "same" | "removed" | "added" }[] = [];
  const newResult: { text: string; type: "same" | "removed" | "added" }[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && oldTokens[i] === newTokens[j]) {
      oldResult.push({ text: oldTokens[i], type: "same" });
      newResult.push({ text: newTokens[j], type: "same" });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      newResult.push({ text: newTokens[j], type: "added" }); j++;
    } else {
      oldResult.push({ text: oldTokens[i], type: "removed" }); i++;
    }
  }
  return [oldResult, newResult];
}

function parseDiff(raw: string): FileDiff[] {
  const sections = raw.split(/(?=^diff --git )/m).filter((s) => s.trim());
  const files: FileDiff[] = [];

  for (const section of sections) {
    const headerMatch = section.match(/^diff --git a\/(.+) b\/(.+)/m);
    if (!headerMatch) continue;
    const oldPath = headerMatch[1];
    const path = headerMatch[2];
    const isBinary = /^Binary files/.test(section) || section.includes("\nBinary files");
    const isNew = section.includes("\nnew file mode");
    const isDeleted = section.includes("\ndeleted file mode");
    let added = 0, removed = 0;
    for (const line of section.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) added++;
      if (line.startsWith("-") && !line.startsWith("---")) removed++;
    }
    files.push({ path, oldPath, added, removed, rawDiff: section, isBinary, isNew, isDeleted });
  }
  return files;
}

function parseHunks(rawDiff: string): DiffLine[] {
  const lines = rawDiff.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0, newLine = 0;

  // Collect raw lines first for word diff pairing
  let i = 0;
  // Skip header lines (diff --git, index, ---, +++)
  while (i < lines.length && !lines[i].startsWith("@@")) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      if (m) {
        oldLine = parseInt(m[1]);
        newLine = parseInt(m[2]);
        const extra = m[3] ? m[3].trim() : "";
        result.push({ type: "hunk", content: line, oldLineNo: null, newLineNo: null, oldTokens: undefined, newTokens: extra ? [{ text: extra, type: "same" }] : undefined });
      }
      i++;
      continue;
    }

    // Collect consecutive - and + blocks for word diff
    if ((line.startsWith("-") && !line.startsWith("---")) ||
        (line.startsWith("+") && !line.startsWith("+++"))) {
      const removedLines: { raw: string; oldLn: number }[] = [];
      const addedLines: { raw: string; newLn: number }[] = [];

      let j = i;
      while (j < lines.length && lines[j].startsWith("-") && !lines[j].startsWith("---")) {
        removedLines.push({ raw: lines[j], oldLn: oldLine++ });
        j++;
      }
      while (j < lines.length && lines[j].startsWith("+") && !lines[j].startsWith("+++")) {
        addedLines.push({ raw: lines[j], newLn: newLine++ });
        j++;
      }

      const pairCount = Math.min(removedLines.length, addedLines.length);
      for (let k = 0; k < removedLines.length; k++) {
        if (k < pairCount) {
          const [oldTokens] = wordDiff(removedLines[k].raw, addedLines[k].raw);
          result.push({ type: "removed", content: removedLines[k].raw.slice(1), oldLineNo: removedLines[k].oldLn, newLineNo: null, oldTokens });
        } else {
          result.push({ type: "removed", content: removedLines[k].raw.slice(1), oldLineNo: removedLines[k].oldLn, newLineNo: null });
        }
      }
      for (let k = 0; k < addedLines.length; k++) {
        if (k < pairCount) {
          const [, newTokens] = wordDiff(removedLines[k].raw, addedLines[k].raw);
          result.push({ type: "added", content: addedLines[k].raw.slice(1), oldLineNo: null, newLineNo: addedLines[k].newLn, newTokens });
        } else {
          result.push({ type: "added", content: addedLines[k].raw.slice(1), oldLineNo: null, newLineNo: addedLines[k].newLn });
        }
      }
      i = j;
      continue;
    }

    if (line.startsWith(" ") || line === "") {
      result.push({ type: "context", content: line.slice(1), oldLineNo: oldLine++, newLineNo: newLine++ });
    }
    i++;
  }

  return result;
}

function fileIcon(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const colors: Record<string, string> = {
    ts: "text-blue-400", tsx: "text-blue-400", js: "text-yellow-400", jsx: "text-yellow-400",
    rs: "text-orange-400", css: "text-purple-400", scss: "text-pink-400",
    json: "text-green-400", md: "text-zinc-400", toml: "text-orange-300",
    html: "text-orange-400", svg: "text-green-300",
  };
  return colors[ext] ?? "text-zinc-500";
}

function FileDiffView({ file }: { file: FileDiff }) {
  const hunks = parseHunks(file.rawDiff);
  const filename = file.path.split("/").pop() ?? file.path;
  const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/") + 1) : "";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* File header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/2 shrink-0">
        <svg className="w-3.5 h-3.5 text-zinc-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-[11px] text-zinc-600 font-mono truncate">{dir}</span>
        <span className={`text-[11px] font-mono font-medium ${fileIcon(file.path)}`}>{filename}</span>
        {file.isNew && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20">new file</span>}
        {file.isDeleted && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">deleted</span>}
        {!file.isNew && !file.isDeleted && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {file.added > 0 && <span className="text-[11px] text-green-400 font-mono">+{file.added}</span>}
            {file.removed > 0 && <span className="text-[11px] text-red-400 font-mono">-{file.removed}</span>}
          </div>
        )}
      </div>

      {/* Diff content */}
      {file.isBinary ? (
        <div className="flex items-center justify-center flex-1 text-xs text-zinc-600">Binary file</div>
      ) : hunks.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-xs text-zinc-600">No changes</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto font-mono text-xs leading-5">
          <table className="w-full border-collapse">
            <tbody>
              {hunks.map((dl, idx) => {
                if (dl.type === "hunk") {
                  return (
                    <tr key={idx} className="bg-blue-500/5">
                      <td className="w-10 text-right pr-2 select-none text-zinc-700 border-r border-white/5 py-0.5 px-2" colSpan={2} />
                      <td className="px-4 py-0.5 text-blue-400/70 text-[11px]">
                        {dl.content.match(/@@ .* @@/)?.[0]}
                        {dl.newTokens?.[0]?.text && <span className="ml-2 text-zinc-500">{dl.newTokens[0].text}</span>}
                      </td>
                    </tr>
                  );
                }
                if (dl.type === "removed") {
                  return (
                    <tr key={idx} className="bg-red-500/8 hover:bg-red-500/12 transition-colors">
                      <td className="w-10 text-right pr-3 select-none text-red-400/50 border-r border-red-500/10 py-0.5 pl-2 tabular-nums">
                        {dl.oldLineNo}
                      </td>
                      <td className="w-10 text-right pr-3 select-none text-zinc-700 border-r border-white/5 py-0.5 tabular-nums" />
                      <td className="px-4 py-0.5 text-red-300 whitespace-pre">
                        <span className="text-red-500/60 select-none mr-1">−</span>
                        {dl.oldTokens ? dl.oldTokens.map((tok, ti) =>
                          tok.type === "removed"
                            ? <span key={ti} className="bg-red-500/30 rounded-sm">{tok.text}</span>
                            : <span key={ti}>{tok.text}</span>
                        ) : dl.content}
                      </td>
                    </tr>
                  );
                }
                if (dl.type === "added") {
                  return (
                    <tr key={idx} className="bg-green-500/8 hover:bg-green-500/12 transition-colors">
                      <td className="w-10 text-right pr-3 select-none text-zinc-700 border-r border-white/5 py-0.5 pl-2 tabular-nums" />
                      <td className="w-10 text-right pr-3 select-none text-green-400/50 border-r border-green-500/10 py-0.5 tabular-nums">
                        {dl.newLineNo}
                      </td>
                      <td className="px-4 py-0.5 text-green-300 whitespace-pre">
                        <span className="text-green-500/60 select-none mr-1">+</span>
                        {dl.newTokens ? dl.newTokens.map((tok, ti) =>
                          tok.type === "added"
                            ? <span key={ti} className="bg-green-500/30 rounded-sm">{tok.text}</span>
                            : <span key={ti}>{tok.text}</span>
                        ) : dl.content}
                      </td>
                    </tr>
                  );
                }
                // context
                return (
                  <tr key={idx} className="hover:bg-white/2 transition-colors">
                    <td className="w-10 text-right pr-3 select-none text-zinc-700 border-r border-white/5 py-0.5 pl-2 tabular-nums">
                      {dl.oldLineNo}
                    </td>
                    <td className="w-10 text-right pr-3 select-none text-zinc-700 border-r border-white/5 py-0.5 tabular-nums">
                      {dl.newLineNo}
                    </td>
                    <td className="px-4 py-0.5 text-zinc-400 whitespace-pre">
                      <span className="select-none mr-1 text-transparent"> </span>
                      {dl.content || " "}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BranchCompare({ repoPath, currentBranch }: Props) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [base, setBase] = useState("");
  const [compare, setCompare] = useState(currentBranch);
  const [files, setFiles] = useState<FileDiff[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBranches(repoPath).then(setBranches).catch(() => {});
  }, [repoPath]);

  useEffect(() => {
    if (branches.length === 0 || base) return;
    const mainBranch = branches.find((b) => b.name === "main" || b.name === "master");
    setBase(mainBranch?.name ?? branches[0]?.name ?? "");
  }, [branches, base]);

  useEffect(() => {
    setCompare(currentBranch);
    setBase("");
    setFiles(null);
    setSelectedFile(null);
    setError(null);
  }, [repoPath, currentBranch]);

  async function handleCompare() {
    if (!base || !compare || base === compare) return;
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    try {
      const result = await api.getBranchDiff(repoPath, base, compare);
      if (!result) {
        setFiles([]);
      } else {
        const parsed = parseDiff(result);
        setFiles(parsed);
        if (parsed.length > 0) setSelectedFile(parsed[0]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote);
  const totalAdded = files?.reduce((s, f) => s + f.added, 0) ?? 0;
  const totalRemoved = files?.reduce((s, f) => s + f.removed, 0) ?? 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={base}
            onChange={(e) => { setBase(e.target.value); setFiles(null); setSelectedFile(null); }}
            className="flex-1 min-w-0 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-white/20"
          >
            {localBranches.length > 0 && (
              <optgroup label="Local">
                {localBranches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
              </optgroup>
            )}
            {remoteBranches.length > 0 && (
              <optgroup label="Remote">
                {remoteBranches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
              </optgroup>
            )}
          </select>

          <div className="flex items-center gap-1 shrink-0 text-zinc-600">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </div>

          <select
            value={compare}
            onChange={(e) => { setCompare(e.target.value); setFiles(null); setSelectedFile(null); }}
            className="flex-1 min-w-0 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-zinc-300 outline-none focus:border-white/20"
          >
            {localBranches.length > 0 && (
              <optgroup label="Local">
                {localBranches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
              </optgroup>
            )}
            {remoteBranches.length > 0 && (
              <optgroup label="Remote">
                {remoteBranches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
              </optgroup>
            )}
          </select>

          <button
            onClick={handleCompare}
            disabled={!base || !compare || base === compare || loading}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-40 transition-colors shrink-0"
          >
            {loading ? "Comparing…" : "Compare"}
          </button>
        </div>

        {/* Summary bar */}
        {files && files.length > 0 && (
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-[11px] text-zinc-600">{files.length} file{files.length !== 1 ? "s" : ""} changed</span>
            {totalAdded > 0 && <span className="text-[11px] text-green-400 font-mono">+{totalAdded}</span>}
            {totalRemoved > 0 && <span className="text-[11px] text-red-400 font-mono">-{totalRemoved}</span>}
            {/* Mini bar chart */}
            <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-white/5 max-w-32">
              {totalAdded + totalRemoved > 0 && (
                <>
                  <div className="bg-green-500/60 h-full" style={{ width: `${(totalAdded / (totalAdded + totalRemoved)) * 100}%` }} />
                  <div className="bg-red-500/60 h-full flex-1" />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 shrink-0">
          {error}
        </div>
      )}

      {/* Empty states */}
      {!error && files === null && (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-700">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <p className="text-sm">Select two branches and click Compare</p>
        </div>
      )}
      {!error && files !== null && files.length === 0 && (
        <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
          No differences between <span className="font-mono mx-1.5 text-zinc-400">{base}</span> and <span className="font-mono mx-1.5 text-zinc-400">{compare}</span>
        </div>
      )}

      {/* Main panel: file list + diff viewer */}
      {files && files.length > 0 && (
        <div className="flex flex-1 min-h-0">
          {/* File list */}
          <div className="w-56 shrink-0 border-r border-white/8 flex flex-col min-h-0 overflow-y-auto">
            {files.map((f) => {
              const filename = f.path.split("/").pop() ?? f.path;
              const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/") + 1) : "";
              const isSelected = selectedFile?.path === f.path;
              return (
                <button
                  key={f.path}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors border-b border-white/4
                    ${isSelected ? "bg-white/8" : "hover:bg-white/4"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium truncate ${fileIcon(f.path)}`}>{filename}</p>
                    {dir && <p className="text-[10px] text-zinc-700 truncate mt-0.5">{dir}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0 mt-0.5">
                    {f.added > 0 && <span className="text-[10px] text-green-400 font-mono leading-none">+{f.added}</span>}
                    {f.removed > 0 && <span className="text-[10px] text-red-400 font-mono leading-none">-{f.removed}</span>}
                    {f.isBinary && <span className="text-[10px] text-zinc-600">bin</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Diff viewer */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
            {selectedFile
              ? <FileDiffView file={selectedFile} />
              : <div className="flex items-center justify-center h-full text-zinc-700 text-xs">Select a file</div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
