mod git;
mod launcher;

use git::{BranchInfo, CommitInfo, RepoStatus, StashEntry, TagInfo, RemoteInfo};
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
async fn get_commit_diff(repo_path: String, hash: String) -> Result<String, String> {
    git::get_commit_diff(&repo_path, &hash)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
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
            get_commit_diff,
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
            pick_folder,
            detect_apps,
            open_in_editor,
            open_in_terminal,
            open_in_finder,
            send_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running grove");
}
