interface Props {
  repoName: string;
  currentGroup: string | null;
  allGroupNames: string[];
  groupInput: string;
  onGroupInputChange: (v: string) => void;
  onAssign: (name: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export default function GroupPicker({
  repoName,
  currentGroup,
  allGroupNames,
  groupInput,
  onGroupInputChange,
  onAssign,
  onRemove,
  onClose,
}: Props) {
  const filteredGroups = allGroupNames.filter(
    (g) => g.toLowerCase().includes(groupInput.toLowerCase())
  );
  const showCreate = groupInput.trim() && !allGroupNames.includes(groupInput.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-64 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-xs font-semibold text-white">Assign group</p>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{repoName}</p>
        </div>
        <div className="p-3">
          <input
            autoFocus
            value={groupInput}
            onChange={(e) => onGroupInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && groupInput.trim()) onAssign(groupInput.trim());
              if (e.key === "Escape") onClose();
            }}
            placeholder="Group name…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20"
          />
          <div className="mt-2 space-y-0.5">
            {filteredGroups.map((g) => (
              <button
                key={g}
                onClick={() => onAssign(g)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors
                  ${currentGroup === g ? "bg-blue-500/15 text-blue-300" : "text-zinc-300 hover:bg-white/8"}`}
              >
                {g}
                {currentGroup === g && <span className="ml-2 text-zinc-600">current</span>}
              </button>
            ))}
            {showCreate && (
              <button
                onClick={() => onAssign(groupInput.trim())}
                className="w-full text-left px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 rounded-md transition-colors"
              >
                + Create "{groupInput.trim()}"
              </button>
            )}
            {currentGroup && (
              <button
                onClick={onRemove}
                className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
              >
                Remove from group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
