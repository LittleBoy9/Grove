use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct App {
    pub id: String,
    pub name: String,
    pub kind: String, // "editor" | "terminal"
    pub installed: bool,
}

struct EditorDef {
    id: &'static str,
    name: &'static str,
    cli: Option<&'static str>,       // CLI command name to check in PATH
    app_name: Option<&'static str>,  // .app name in /Applications
}

struct TerminalDef {
    id: &'static str,
    name: &'static str,
    app_name: &'static str,
}

const EDITORS: &[EditorDef] = &[
    EditorDef { id: "vscode",   name: "VS Code",  cli: Some("code"),   app_name: Some("Visual Studio Code") },
    EditorDef { id: "cursor",   name: "Cursor",   cli: Some("cursor"), app_name: Some("Cursor") },
    EditorDef { id: "zed",      name: "Zed",      cli: Some("zed"),    app_name: Some("Zed") },
    EditorDef { id: "windsurf", name: "Windsurf", cli: Some("windsurf"),app_name: Some("Windsurf") },
    EditorDef { id: "xcode",    name: "Xcode",    cli: Some("xed"),    app_name: Some("Xcode") },
    EditorDef { id: "sublime",  name: "Sublime Text", cli: Some("subl"), app_name: Some("Sublime Text") },
    EditorDef { id: "idea",     name: "IntelliJ IDEA", cli: None,      app_name: Some("IntelliJ IDEA") },
    EditorDef { id: "webstorm", name: "WebStorm", cli: None,           app_name: Some("WebStorm") },
    EditorDef { id: "antigravity", name: "Antigravity", cli: Some("agy"), app_name: Some("Antigravity") },
];

const TERMINALS: &[TerminalDef] = &[
    TerminalDef { id: "warp",     name: "Warp",         app_name: "Warp" },
    TerminalDef { id: "iterm2",   name: "iTerm2",       app_name: "iTerm" },
    TerminalDef { id: "ghostty",  name: "Ghostty",      app_name: "Ghostty" },
    TerminalDef { id: "terminal", name: "Terminal",     app_name: "Terminal" },
    TerminalDef { id: "hyper",    name: "Hyper",        app_name: "Hyper" },
    TerminalDef { id: "kitty",    name: "Kitty",        app_name: "kitty" },
    TerminalDef { id: "alacritty",name: "Alacritty",   app_name: "Alacritty" },
];

fn app_installed(app_name: &str) -> bool {
    Path::new(&format!("/Applications/{}.app", app_name)).exists()
        || Path::new(&format!("/System/Applications/{}.app", app_name)).exists()
        || Path::new(&format!("/System/Applications/Utilities/{}.app", app_name)).exists()
        || Path::new(&format!(
            "/Users/{}/Applications/{}.app",
            whoami(),
            app_name
        ))
        .exists()
}

fn cli_in_path(cmd: &str) -> bool {
    Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn whoami() -> String {
    Command::new("whoami")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

pub fn detect_apps() -> Vec<App> {
    let mut apps = Vec::new();

    for e in EDITORS {
        let installed = e.cli.map(cli_in_path).unwrap_or(false)
            || e.app_name.map(app_installed).unwrap_or(false);
        apps.push(App {
            id: e.id.to_string(),
            name: e.name.to_string(),
            kind: "editor".to_string(),
            installed,
        });
    }

    for t in TERMINALS {
        let installed = app_installed(t.app_name);
        apps.push(App {
            id: t.id.to_string(),
            name: t.name.to_string(),
            kind: "terminal".to_string(),
            installed,
        });
    }

    apps
}

pub fn open_in_editor(editor_id: &str, repo_path: &str) -> Result<(), String> {
    match editor_id {
        "vscode"   => open_cli_or_app("code",     "Visual Studio Code", repo_path),
        "cursor"   => open_cli_or_app("cursor",   "Cursor",             repo_path),
        "zed"      => open_cli_or_app("zed",      "Zed",                repo_path),
        "windsurf" => open_cli_or_app("windsurf", "Windsurf",           repo_path),
        "xcode"    => open_cli_or_app("xed",      "Xcode",              repo_path),
        "sublime"  => open_cli_or_app("subl",     "Sublime Text",       repo_path),
        "idea"     => open_app("IntelliJ IDEA", repo_path),
        "webstorm" => open_app("WebStorm", repo_path),
        "antigravity" => open_cli_or_app("agy", "Antigravity", repo_path),
        _          => Err(format!("Unknown editor: {}", editor_id)),
    }
}

pub fn open_in_finder(repo_path: &str) -> Result<(), String> {
    Command::new("open")
        .arg(repo_path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open Finder: {}", e))
}

pub fn open_url(url: &str) -> Result<(), String> {
    Command::new("open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open URL: {}", e))
}

pub fn open_in_terminal(terminal_id: &str, repo_path: &str) -> Result<(), String> {
    match terminal_id {
        "warp"      => open_app("Warp", repo_path),
        "iterm2"    => open_iterm(repo_path),
        "ghostty"   => open_app("Ghostty", repo_path),
        "terminal"  => open_app("Terminal", repo_path),
        "hyper"     => open_app("Hyper", repo_path),
        "kitty"     => open_app("kitty", repo_path),
        "alacritty" => open_app("Alacritty", repo_path),
        _           => Err(format!("Unknown terminal: {}", terminal_id)),
    }
}

fn open_cli(cmd: &str, path: &str) -> Result<(), String> {
    Command::new(cmd)
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to launch {}: {}", cmd, e))
}

fn open_cli_or_app(cmd: &str, app_name: &str, path: &str) -> Result<(), String> {
    if cli_in_path(cmd) {
        if open_cli(cmd, path).is_ok() {
            return Ok(());
        }
    }
    open_app(app_name, path)
}

fn open_app(app_name: &str, path: &str) -> Result<(), String> {
    Command::new("open")
        .args(["-a", app_name, path])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open {}: {}", app_name, e))
}

fn open_iterm(path: &str) -> Result<(), String> {
    // iTerm2 needs AppleScript to open in a specific directory
    let script = format!(
        r#"tell application "iTerm2"
            activate
            set newWindow to (create window with default profile)
            tell current session of newWindow
                write text "cd {path} && clear"
            end tell
        end tell"#,
        path = path.replace('"', "\\\"")
    );
    Command::new("osascript")
        .args(["-e", &script])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open iTerm2: {}", e))
}
