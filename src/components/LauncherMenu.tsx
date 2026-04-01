import { useState, useEffect, useRef } from "react";
import { VscVscode } from "react-icons/vsc";
import {
  SiWindsurf, SiSublimetext, SiIntellijidea, SiWebstorm, SiXcode,
  SiWarp, SiIterm2, SiAlacritty, SiHyper,
} from "react-icons/si";
import { api } from "../api";
import { loadSettings } from "../lib/settings";

interface AppEntry {
  id: string;
  name: string;
  kind: string;
  installed: boolean;
}

interface Props {
  repoPath: string;
}

// SVG icon components per app id
function AppIcon({ id }: { id: string }) {
  switch (id) {
    case "vscode":
      return <VscVscode className="w-4 h-4 shrink-0 text-[#0078D4]" />;
    case "cursor":
      return (
        <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0">
          <rect width="100" height="100" rx="15" fill="#000" />
          <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke="white" strokeWidth="8" />
          <path d="M50 30 L70 50 L50 70 L30 50 Z" fill="white" />
        </svg>
      );
    case "zed":
      return (
        <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0">
          <rect width="100" height="100" rx="15" fill="#084CCF" />
          <text x="50" y="68" textAnchor="middle" fontSize="52" fontWeight="900" fontFamily="sans-serif" fill="white">Z</text>
        </svg>
      );
    case "windsurf":
      return <SiWindsurf className="w-4 h-4 shrink-0 text-[#7C3AED]" />;
    case "xcode":
      return <SiXcode className="w-4 h-4 shrink-0 text-[#1A8FE3]" />;
    case "sublime":
      return <SiSublimetext className="w-4 h-4 shrink-0 text-[#FF9800]" />;
    case "idea":
      return <SiIntellijidea className="w-4 h-4 shrink-0 text-[#FE315D]" />;
    case "webstorm":
      return <SiWebstorm className="w-4 h-4 shrink-0 text-[#1D6BF3]" />;
    case "antigravity":
      return (
        <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0">
          <rect width="100" height="100" rx="15" fill="#fff" />
          {/* Google-style multicolor ring */}
          <path d="M50 18 A32 32 0 0 1 82 50" stroke="#4285F4" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M82 50 A32 32 0 0 1 50 82" stroke="#EA4335" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M50 82 A32 32 0 0 1 18 50" stroke="#FBBC05" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M18 50 A32 32 0 0 1 50 18" stroke="#34A853" strokeWidth="12" fill="none" strokeLinecap="round" />
          {/* Upward arrow = antigravity */}
          <path d="M50 62 L50 38 M40 48 L50 38 L60 48" stroke="#202124" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "textedit":
      return (
        <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0">
          <rect width="100" height="100" rx="15" fill="#f5f5f0" />
          <rect x="20" y="22" width="60" height="7" rx="3" fill="#333" />
          <rect x="20" y="37" width="60" height="7" rx="3" fill="#333" />
          <rect x="20" y="52" width="45" height="7" rx="3" fill="#333" />
          <rect x="20" y="67" width="53" height="7" rx="3" fill="#333" />
        </svg>
      );
    // Terminals
    case "warp":
      return <SiWarp className="w-4 h-4 shrink-0 text-[#01A4FF]" />;
    case "iterm2":
      return <SiIterm2 className="w-4 h-4 shrink-0 text-[#00FF00]" />;
    case "ghostty":
      return (
        <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0">
          <rect width="100" height="100" rx="15" fill="#6B21A8" />
          <path d="M50 18 Q72 18 72 38 L72 62 Q72 72 62 72 L62 82 L52 72 L48 72 Q28 72 28 52 L28 38 Q28 18 50 18Z" fill="white" opacity="0.9" />
          <circle cx="40" cy="46" r="5" fill="#6B21A8" />
          <circle cx="60" cy="46" r="5" fill="#6B21A8" />
        </svg>
      );
    case "terminal":
      return (
        <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0">
          <rect width="100" height="100" rx="15" fill="#1C1C1C" />
          <polyline points="18,38 42,50 18,62" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="48" y1="66" x2="82" y2="66" stroke="white" strokeWidth="8" strokeLinecap="round" />
        </svg>
      );
    case "hyper":
      return <SiHyper className="w-4 h-4 shrink-0 text-zinc-200" />;
    case "kitty":
      return (
        <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0">
          <rect width="100" height="100" rx="15" fill="#2D2D2D" />
          <polygon points="22,42 34,22 34,42" fill="#F7C34B" />
          <polygon points="66,42 78,22 78,42" fill="#F7C34B" />
          <ellipse cx="50" cy="58" rx="26" ry="22" fill="#F7C34B" />
          <circle cx="41" cy="55" r="4" fill="#2D2D2D" />
          <circle cx="59" cy="55" r="4" fill="#2D2D2D" />
        </svg>
      );
    case "alacritty":
      return <SiAlacritty className="w-4 h-4 shrink-0 text-[#F45C4E]" />;
    default:
      return (
        <div className="w-4 h-4 rounded bg-zinc-600 shrink-0 flex items-center justify-center text-[9px] text-white font-bold">
          {id[0]?.toUpperCase()}
        </div>
      );
  }
}

function Dropdown({
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  items: AppEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const installed = items.filter((a) => a.installed);
  const notInstalled = items.filter((a) => !a.installed);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
      {installed.length === 0 && (
        <div className="px-3 py-2 text-xs text-zinc-500">None installed</div>
      )}
      {installed.map((app) => (
        <button
          key={app.id}
          onClick={() => { onSelect(app.id); onClose(); }}
          className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/8 transition-colors
            ${selectedId === app.id ? "text-white" : "text-zinc-200"}`}
        >
          <AppIcon id={app.id} />
          <span className="flex-1">{app.name}</span>
          {selectedId === app.id && (
            <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
      ))}
      {notInstalled.length > 0 && installed.length > 0 && (
        <div className="my-1 border-t border-white/5" />
      )}
      {notInstalled.map((app) => (
        <div
          key={app.id}
          className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-zinc-600 cursor-not-allowed"
        >
          <div className="opacity-30"><AppIcon id={app.id} /></div>
          {app.name}
        </div>
      ))}
    </div>
  );
}

export default function LauncherMenu({ repoPath }: Props) {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [defaultEditor, setDefaultEditor] = useState(() => loadSettings().defaultEditor);
  const [defaultTerminal, setDefaultTerminal] = useState(() => loadSettings().defaultTerminal);
  const [finderError, setFinderError] = useState<string | null>(null);

  useEffect(() => {
    api.detectApps().then(setApps).catch(() => {});
    // Re-read settings in case they changed while this component was mounted
    const s = loadSettings();
    setDefaultEditor(s.defaultEditor);
    setDefaultTerminal(s.defaultTerminal);
  }, [repoPath]);

  const editors = apps.filter((a) => a.kind === "editor");
  const terminals = apps.filter((a) => a.kind === "terminal");

  const activeEditor = apps.find((a) => a.id === defaultEditor && a.installed) ?? null;
  const activeTerminal = apps.find((a) => a.id === defaultTerminal && a.installed) ?? null;

  function handleSelectEditor(id: string) {
    setDefaultEditor(id);
    api.openInEditor(id, repoPath);
  }

  function handleSelectTerminal(id: string) {
    setDefaultTerminal(id);
    api.openInTerminal(id, repoPath);
  }

  function handleOpenFinder() {
    setFinderError(null);
    api.openInFinder(repoPath).catch((e) => setFinderError(String(e)));
  }

  return (
    <div className="flex items-center gap-1">
      {/* Editor button */}
      <div className="relative flex items-stretch">
        <button
          onClick={() => activeEditor
            ? api.openInEditor(activeEditor.id, repoPath)
            : (setEditorOpen((v) => !v), setTerminalOpen(false))
          }
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/8 border border-white/8 hover:border-white/15 transition-all"
          title={activeEditor ? `Open in ${activeEditor.name}` : "Open in editor"}
        >
          {activeEditor ? (
            <AppIcon id={activeEditor.id} />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          )}
          <span>{activeEditor ? activeEditor.name : "Editor"}</span>
        </button>
        <button
          onClick={() => { setEditorOpen((v) => !v); setTerminalOpen(false); }}
          className="px-1.5 text-zinc-500 border border-l-0 border-white/8 hover:bg-white/8 rounded-r-lg transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {editorOpen && (
          <Dropdown
            items={editors}
            selectedId={defaultEditor}
            onSelect={handleSelectEditor}
            onClose={() => setEditorOpen(false)}
          />
        )}
      </div>

      {/* Terminal button */}
      <div className="relative flex items-stretch">
        <button
          onClick={() => activeTerminal
            ? api.openInTerminal(activeTerminal.id, repoPath)
            : (setTerminalOpen((v) => !v), setEditorOpen(false))
          }
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/8 border border-white/8 hover:border-white/15 transition-all"
          title={activeTerminal ? `Open in ${activeTerminal.name}` : "Open in terminal"}
        >
          {activeTerminal ? (
            <AppIcon id={activeTerminal.id} />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M8 10l4 4-4 4" />
              <path d="M14 18h4" />
            </svg>
          )}
          <span>{activeTerminal ? activeTerminal.name : "Terminal"}</span>
        </button>
        <button
          onClick={() => { setTerminalOpen((v) => !v); setEditorOpen(false); }}
          className="px-1.5 text-zinc-500 border border-l-0 border-white/8 hover:bg-white/8 rounded-r-lg transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {terminalOpen && (
          <Dropdown
            items={terminals}
            selectedId={defaultTerminal}
            onSelect={handleSelectTerminal}
            onClose={() => setTerminalOpen(false)}
          />
        )}
      </div>

      {/* Finder button */}
      <div className="relative">
        <button
          onClick={handleOpenFinder}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/8 border border-white/8 hover:border-white/15 transition-all"
          title="Open in Finder"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          </svg>
          Finder
        </button>
        {finderError && (
          <div className="absolute right-0 top-full mt-1 z-50 px-2.5 py-1.5 bg-zinc-800 border border-red-500/30 rounded-lg text-[11px] text-red-400 whitespace-nowrap shadow-xl">
            {finderError}
          </div>
        )}
      </div>
    </div>
  );
}
