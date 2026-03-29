import { useState, useEffect } from "react";
import { TagInfo } from "../types";
import { api } from "../api";

interface Props {
  repoPath: string;
}

export default function TagsPanel({ repoPath }: Props) {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadTags() {
    setLoading(true);
    api.listTags(repoPath).then(setTags).catch(() => setTags([])).finally(() => setLoading(false));
  }

  useEffect(() => { loadTags(); }, [repoPath]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setActionLoading("create");
    setError(null);
    try {
      await api.createTag(repoPath, newName.trim(), newMessage.trim());
      setNewName("");
      setNewMessage("");
      setCreating(false);
      loadTags();
    } catch (e) { setError(String(e)); } finally { setActionLoading(null); }
  }

  async function handleDelete(name: string) {
    setActionLoading(`del-${name}`);
    setError(null);
    try {
      await api.deleteTag(repoPath, name);
      setTags((prev) => prev.filter((t) => t.name !== name));
    } catch (e) { setError(String(e)); } finally { setActionLoading(null); }
  }

  return (
    <div className="p-4 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Tags ({tags.length})</h3>
        <button
          onClick={() => setCreating((v) => !v)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New tag
        </button>
      </div>

      {creating && (
        <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/8 space-y-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tag name (e.g. v1.0.0)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 font-mono"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
          />
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message (optional — creates annotated tag)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || actionLoading === "create"}
              className="flex-1 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-40"
            >
              {actionLoading === "create" ? "Creating…" : "Create Tag"}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-600 text-center py-8">Loading tags…</div>
      ) : tags.length === 0 ? (
        <div className="text-xs text-zinc-600 text-center py-8">No tags yet</div>
      ) : (
        <div className="space-y-1">
          {tags.map((tag) => (
            <div key={tag.name} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors">
              <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              <span className="text-xs font-mono text-zinc-200 flex-1">{tag.name}</span>
              <button
                onClick={() => handleDelete(tag.name)}
                disabled={actionLoading === `del-${tag.name}`}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete tag"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
