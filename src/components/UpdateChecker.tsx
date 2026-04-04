import { useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Phase = "idle" | "available" | "downloading" | "ready" | "error";

export default function UpdateChecker() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState(0);
  const [newVersion, setNewVersion] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check silently 3 seconds after launch so it doesn't compete with startup
    const timer = setTimeout(async () => {
      try {
        const u = await check();
        if (u?.available) {
          setUpdate(u);
          setNewVersion(u.version);
          setPhase("available");
        }
      } catch {
        // Silently ignore — no internet or endpoint not set up yet
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleInstall() {
    if (!update) return;
    setPhase("downloading");
    setProgress(0);
    try {
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setProgress(total > 0 ? Math.round((downloaded / total) * 100) : 0);
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      setPhase("ready");
    } catch (e) {
      setPhase("error");
    }
  }

  if (dismissed || phase === "idle") return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border text-xs overflow-hidden
      border-emerald-500/20 bg-emerald-500/8">
      {phase === "available" && (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <span className="text-emerald-300 flex-1">
            Grove <span className="font-semibold">v{newVersion}</span> is available
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ✕
          </button>
          <button
            onClick={handleInstall}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md font-medium transition-colors shrink-0"
          >
            Update
          </button>
        </div>
      )}

      {phase === "downloading" && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-zinc-400">Downloading update…</span>
            <span className="text-zinc-500 font-mono">{progress}%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {phase === "ready" && (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-emerald-300 flex-1">Update ready — restart to apply</span>
          <button
            onClick={relaunch}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md font-medium transition-colors shrink-0"
          >
            Restart
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-red-400 flex-1">Update failed — try again later</span>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
