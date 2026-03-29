import { invoke } from "@tauri-apps/api/core";
import { loadSettings } from "./settings";

export async function notify(title: string, body: string) {
  const { notifications } = loadSettings();
  if (!notifications) return;
  try {
    await invoke("send_notification", { title, body });
  } catch {
    // notifications not available — silently ignore
  }
}
