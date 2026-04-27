mod git;
mod launcher;

use git::{BranchInfo, CommitInfo, RepoStatus, StashEntry, TagInfo, RemoteInfo, SubmoduleInfo, WorktreeInfo, RepoStats, BranchOrigin};
use launcher::App;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
async fn scan_directory(path: String, depth: Option<usize>) -> Result<Vec<String>, String> {
    Ok(git::scan_for_repos(&path, depth.unwrap_or(4)))
}

#[tauri::command]
async fn add_repo(path: String) -> Result<bool, String> {
    Ok(git::is_git_repo(&path))
}

#[tauri::command]
async fn get_repo_status(path: String) -> Result<RepoStatus, String> {
    git::get_repo_status(&path)
}

#[tauri::command]
async fn get_multiple_statuses(paths: Vec<String>) -> Vec<Result<RepoStatus, String>> {
    paths.iter().map(|p| git::get_repo_status(p)).collect()
}

#[tauri::command]
async fn stage_files(repo_path: String, files: Vec<String>) -> Result<(), String> {
    git::stage_files(&repo_path, &files)
}

#[tauri::command]
async fn unstage_files(repo_path: String, files: Vec<String>) -> Result<(), String> {
    git::unstage_files(&repo_path, &files)
}

#[tauri::command]
async fn discard_file(repo_path: String, file_path: String) -> Result<(), String> {
    git::discard_file(&repo_path, &file_path)
}

#[tauri::command]
async fn discard_all(repo_path: String) -> Result<(), String> {
    git::discard_all(&repo_path)
}

#[tauri::command]
async fn commit_changes(repo_path: String, message: String) -> Result<String, String> {
    git::commit(&repo_path, &message)
}

#[tauri::command]
async fn amend_commit(repo_path: String, message: String) -> Result<String, String> {
    git::amend_commit(&repo_path, &message)
}

#[tauri::command]
async fn push_repo(repo_path: String) -> Result<String, String> {
    git::push(&repo_path)
}

#[tauri::command]
async fn pull_repo(repo_path: String) -> Result<String, String> {
    git::pull(&repo_path)
}

#[tauri::command]
async fn fetch_repo(repo_path: String) -> Result<String, String> {
    git::fetch(&repo_path)
}

#[tauri::command]
async fn fetch_all_repos(paths: Vec<String>) -> Vec<(String, Result<String, String>)> {
    paths.into_iter().map(|p| {
        let result = git::fetch(&p);
        (p, result)
    }).collect()
}

#[tauri::command]
async fn pull_all_repos(paths: Vec<String>) -> Vec<(String, Result<String, String>)> {
    paths.into_iter().map(|p| {
        let result = git::pull(&p);
        (p, result)
    }).collect()
}

#[tauri::command]
async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> Result<String, String> {
    git::get_file_diff(&repo_path, &file_path, staged)
}

// --- Branches ---

#[tauri::command]
async fn list_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    git::list_branches(&repo_path)
}

#[tauri::command]
async fn checkout_branch(repo_path: String, branch: String) -> Result<(), String> {
    git::checkout_branch(&repo_path, &branch)
}

#[tauri::command]
async fn create_branch(repo_path: String, name: String) -> Result<(), String> {
    git::create_branch(&repo_path, &name)
}

#[tauri::command]
async fn delete_branch(repo_path: String, name: String) -> Result<(), String> {
    git::delete_branch(&repo_path, &name)
}

// --- Stash ---

#[tauri::command]
async fn stash_save(repo_path: String, message: String) -> Result<(), String> {
    git::stash_save(&repo_path, &message)
}

#[tauri::command]
async fn stash_pop(repo_path: String) -> Result<(), String> {
    git::stash_pop(&repo_path)
}

#[tauri::command]
async fn stash_apply(repo_path: String, index: usize) -> Result<(), String> {
    git::stash_apply(&repo_path, index)
}

#[tauri::command]
async fn stash_drop(repo_path: String, index: usize) -> Result<(), String> {
    git::stash_drop(&repo_path, index)
}

#[tauri::command]
async fn list_stashes(repo_path: String) -> Result<Vec<StashEntry>, String> {
    git::list_stashes(&repo_path)
}

// --- Log ---

#[tauri::command]
async fn get_log(repo_path: String, limit: usize) -> Result<Vec<CommitInfo>, String> {
    git::get_log(&repo_path, limit)
}

#[tauri::command]
async fn get_log_graph(repo_path: String, limit: usize) -> Result<Vec<git::GraphCommitInfo>, String> {
    git::get_log_graph(&repo_path, limit)
}

#[tauri::command]
async fn get_commit_diff(repo_path: String, hash: String) -> Result<String, String> {
    git::get_commit_diff(&repo_path, &hash)
}

#[tauri::command]
async fn get_branch_diff(repo_path: String, base: String, compare: String) -> Result<String, String> {
    git::get_branch_diff(&repo_path, &base, &compare)
}

#[tauri::command]
async fn push_force(repo_path: String) -> Result<String, String> {
    git::push_force(&repo_path)
}

#[tauri::command]
async fn clone_repo(url: String, destination: String) -> Result<String, String> {
    git::clone_repo(&url, &destination)
}

#[tauri::command]
async fn get_file_log(repo_path: String, file_path: String, limit: usize) -> Result<Vec<CommitInfo>, String> {
    git::get_file_log(&repo_path, &file_path, limit)
}

// --- Notifications ---

#[tauri::command]
async fn send_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn merge_branch(repo_path: String, branch: String) -> Result<String, String> {
    git::merge_branch(&repo_path, &branch)
}

#[tauri::command]
async fn rebase_branch(repo_path: String, branch: String) -> Result<String, String> {
    git::rebase_branch(&repo_path, &branch)
}

#[tauri::command]
async fn revert_commit(repo_path: String, hash: String) -> Result<String, String> {
    git::revert_commit(&repo_path, &hash)
}

#[tauri::command]
async fn cherry_pick(repo_path: String, hash: String) -> Result<String, String> {
    git::cherry_pick(&repo_path, &hash)
}

#[tauri::command]
async fn force_delete_branch(repo_path: String, name: String) -> Result<(), String> {
    git::force_delete_branch(&repo_path, &name)
}

#[tauri::command]
async fn push_upstream(repo_path: String, branch: String) -> Result<String, String> {
    git::push_upstream(&repo_path, &branch)
}

#[tauri::command]
async fn list_tags(repo_path: String) -> Result<Vec<TagInfo>, String> {
    git::list_tags(&repo_path)
}

#[tauri::command]
async fn create_tag(repo_path: String, name: String, message: String) -> Result<(), String> {
    git::create_tag(&repo_path, &name, &message)
}

#[tauri::command]
async fn delete_tag(repo_path: String, name: String) -> Result<(), String> {
    git::delete_tag(&repo_path, &name)
}

#[tauri::command]
async fn list_remotes(repo_path: String) -> Result<Vec<RemoteInfo>, String> {
    git::list_remotes(&repo_path)
}

#[tauri::command]
async fn add_remote(repo_path: String, name: String, url: String) -> Result<(), String> {
    git::add_remote(&repo_path, &name, &url)
}

#[tauri::command]
async fn remove_remote(repo_path: String, name: String) -> Result<(), String> {
    git::remove_remote(&repo_path, &name)
}

#[tauri::command]
async fn rename_remote(repo_path: String, old_name: String, new_name: String) -> Result<(), String> {
    git::rename_remote(&repo_path, &old_name, &new_name)
}

// --- Conflict resolution ---

#[tauri::command]
async fn resolve_conflict_ours(repo_path: String, file_path: String) -> Result<(), String> {
    git::resolve_conflict_ours(&repo_path, &file_path)
}

#[tauri::command]
async fn resolve_conflict_theirs(repo_path: String, file_path: String) -> Result<(), String> {
    git::resolve_conflict_theirs(&repo_path, &file_path)
}

// --- Gitignore ---

#[tauri::command]
async fn read_gitignore(repo_path: String) -> Result<String, String> {
    git::read_gitignore(&repo_path)
}

#[tauri::command]
async fn write_gitignore(repo_path: String, content: String) -> Result<(), String> {
    git::write_gitignore(&repo_path, &content)
}

// --- File tree ---

#[tauri::command]
async fn read_file_tree(repo_path: String) -> Result<Vec<String>, String> {
    git::read_file_tree(&repo_path)
}

// --- Misc ---

#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |f| {
        let _ = tx.send(f);
    });
    rx.await.ok().flatten().map(|p| p.to_string())
}

#[tauri::command]
async fn detect_apps() -> Vec<App> {
    launcher::detect_apps()
}

#[tauri::command]
async fn open_in_editor(editor_id: String, repo_path: String) -> Result<(), String> {
    launcher::open_in_editor(&editor_id, &repo_path)
}

#[tauri::command]
async fn open_in_terminal(terminal_id: String, repo_path: String) -> Result<(), String> {
    launcher::open_in_terminal(&terminal_id, &repo_path)
}

#[tauri::command]
async fn open_in_finder(repo_path: String) -> Result<(), String> {
    launcher::open_in_finder(&repo_path)
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    launcher::open_url(&url)
}

// --- Stash diff ---

#[tauri::command]
async fn stash_diff(repo_path: String, index: usize) -> Result<String, String> {
    git::stash_diff(&repo_path, index)
}

// --- Submodules ---

#[tauri::command]
async fn list_submodules(repo_path: String) -> Result<Vec<SubmoduleInfo>, String> {
    git::list_submodules(&repo_path)
}

#[tauri::command]
async fn update_submodules(repo_path: String) -> Result<String, String> {
    git::update_submodules(&repo_path)
}

// --- Worktrees ---

#[tauri::command]
async fn list_worktrees(repo_path: String) -> Result<Vec<WorktreeInfo>, String> {
    git::list_worktrees(&repo_path)
}

#[tauri::command]
async fn add_worktree(repo_path: String, path: String, branch: String, create_branch: bool) -> Result<String, String> {
    git::add_worktree(&repo_path, &path, &branch, create_branch)
}

#[tauri::command]
async fn remove_worktree(repo_path: String, wt_path: String) -> Result<String, String> {
    git::remove_worktree(&repo_path, &wt_path)
}

// --- Interactive rebase ---

#[tauri::command]
async fn interactive_rebase(repo_path: String, base: String, instructions: String) -> Result<String, String> {
    git::interactive_rebase(&repo_path, &base, &instructions)
}

#[tauri::command]
async fn abort_rebase(repo_path: String) -> Result<String, String> {
    git::abort_rebase(&repo_path)
}

#[tauri::command]
async fn is_rebasing(repo_path: String) -> bool {
    git::is_rebasing(&repo_path)
}

// --- Repo stats ---

#[tauri::command]
async fn get_repo_stats(repo_path: String) -> Result<RepoStats, String> {
    git::get_repo_stats(&repo_path)
}

// --- Branch timeline ---

#[tauri::command]
async fn get_branch_timeline(repo_path: String) -> Result<Vec<BranchOrigin>, String> {
    git::get_branch_timeline(&repo_path)
}

// --- Delete repo folder ---

#[tauri::command]
async fn delete_repo_folder(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Path is empty".into());
    }

    let p = std::path::Path::new(trimmed);

    if !p.is_absolute() {
        return Err("Path must be absolute".into());
    }

    // Resolve to a canonical path so we compare against the real thing
    let canonical = p
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;

    // Refuse to touch filesystem root, home, or anything suspiciously shallow
    if canonical.components().count() < 3 {
        return Err("Refusing to delete a top-level path".into());
    }
    if let Some(home) = dirs_home() {
        if canonical == home {
            return Err("Refusing to delete the home directory".into());
        }
    }

    // Must actually be a git repo (either a .git directory or a .git file for worktrees)
    let git_marker = canonical.join(".git");
    if !git_marker.exists() {
        return Err("Path is not a git repository — refusing to delete".into());
    }

    std::fs::remove_dir_all(&canonical).map_err(|e| e.to_string())
}

fn dirs_home() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME").map(std::path::PathBuf::from)
}

// --- AI key secure storage (macOS Keychain) ---

fn ai_key_service() -> String {
    "dev.grove.ai-keys".to_string()
}

#[tauri::command]
async fn set_ai_key(provider: String, key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&ai_key_service(), &provider)
        .map_err(|e| format!("Keychain error: {}", e))?;
    entry.set_password(&key).map_err(|e| format!("Keychain error: {}", e))
}

#[tauri::command]
async fn get_ai_key(provider: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(&ai_key_service(), &provider)
        .map_err(|e| format!("Keychain error: {}", e))?;
    match entry.get_password() {
        Ok(k) => Ok(Some(k)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Keychain error: {}", e)),
    }
}

#[tauri::command]
async fn delete_ai_key(provider: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&ai_key_service(), &provider)
        .map_err(|e| format!("Keychain error: {}", e))?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Keychain error: {}", e)),
    }
}

// --- Search log ---

#[tauri::command]
async fn search_log(
    repo_path: String,
    query: String,
    author: String,
    after: String,
    before: String,
    limit: usize,
) -> Result<Vec<CommitInfo>, String> {
    git::search_log(&repo_path, &query, &author, &after, &before, limit)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            add_repo,
            get_repo_status,
            get_multiple_statuses,
            stage_files,
            unstage_files,
            discard_file,
            discard_all,
            commit_changes,
            amend_commit,
            push_repo,
            pull_repo,
            fetch_repo,
            fetch_all_repos,
            pull_all_repos,
            get_file_diff,
            list_branches,
            checkout_branch,
            create_branch,
            delete_branch,
            stash_save,
            stash_pop,
            stash_apply,
            stash_drop,
            list_stashes,
            get_log,
            get_log_graph,
            get_commit_diff,
            get_branch_diff,
            push_force,
            clone_repo,
            get_file_log,
            merge_branch,
            rebase_branch,
            revert_commit,
            cherry_pick,
            force_delete_branch,
            push_upstream,
            list_tags,
            create_tag,
            delete_tag,
            list_remotes,
            add_remote,
            remove_remote,
            rename_remote,
            resolve_conflict_ours,
            resolve_conflict_theirs,
            read_gitignore,
            write_gitignore,
            read_file_tree,
            pick_folder,
            detect_apps,
            open_in_editor,
            open_in_terminal,
            open_in_finder,
            open_url,
            send_notification,
            stash_diff,
            list_submodules,
            update_submodules,
            list_worktrees,
            add_worktree,
            remove_worktree,
            interactive_rebase,
            abort_rebase,
            is_rebasing,
            get_repo_stats,
            get_branch_timeline,
            search_log,
            delete_repo_folder,
            set_ai_key,
            get_ai_key,
            delete_ai_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running grove");
}
