use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepoStatus {
    pub path: String,
    pub name: String,
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub staged: Vec<FileChange>,
    pub unstaged: Vec<FileChange>,
    pub untracked: Vec<FileChange>,
    pub last_commit: Option<CommitInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileChange {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StashEntry {
    pub index: usize,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagInfo {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
}

fn run_git(repo_path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn run_git_checked(repo_path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if output.status.success() {
        Ok(stdout)
    } else {
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

pub fn get_repo_status(repo_path: &str) -> Result<RepoStatus, String> {
    let path = Path::new(repo_path);
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let branch = run_git(repo_path, &["rev-parse", "--abbrev-ref", "HEAD"])
        .unwrap_or_else(|_| "unknown".to_string());

    let (ahead, behind) = get_ahead_behind(repo_path, &branch);

    let status_output =
        run_git(repo_path, &["status", "--porcelain=v1"]).unwrap_or_default();

    let mut staged: Vec<FileChange> = Vec::new();
    let mut unstaged: Vec<FileChange> = Vec::new();
    let mut untracked: Vec<FileChange> = Vec::new();

    for line in status_output.lines() {
        if line.len() < 3 {
            continue;
        }
        let xy = &line[..2];
        let file_path = line[3..].to_string();
        let x = &xy[..1];
        let y = &xy[1..];

        if xy == "??" {
            untracked.push(FileChange {
                path: file_path,
                status: "untracked".to_string(),
            });
            continue;
        }

        if x != " " && x != "?" {
            staged.push(FileChange {
                path: file_path.clone(),
                status: status_label(x),
            });
        }
        if y != " " && y != "?" {
            unstaged.push(FileChange {
                path: file_path,
                status: status_label(y),
            });
        }
    }

    let last_commit = get_last_commit(repo_path);

    Ok(RepoStatus {
        path: repo_path.to_string(),
        name,
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        last_commit,
    })
}

fn status_label(code: &str) -> String {
    match code {
        "M" => "modified",
        "A" => "added",
        "D" => "deleted",
        "R" => "renamed",
        "C" => "copied",
        "U" => "conflict",
        _ => "changed",
    }
    .to_string()
}

fn get_ahead_behind(repo_path: &str, branch: &str) -> (i32, i32) {
    let remote = format!("origin/{}", branch);
    let output = Command::new("git")
        .args(["rev-list", "--left-right", "--count", &format!("{}...HEAD", remote)])
        .current_dir(repo_path)
        .output();

    if let Ok(out) = output {
        let s = String::from_utf8_lossy(&out.stdout);
        let parts: Vec<&str> = s.trim().split_whitespace().collect();
        if parts.len() == 2 {
            let behind = parts[0].parse().unwrap_or(0);
            let ahead = parts[1].parse().unwrap_or(0);
            return (ahead, behind);
        }
    }
    (0, 0)
}

fn get_last_commit(repo_path: &str) -> Option<CommitInfo> {
    let output = run_git(
        repo_path,
        &["log", "-1", "--format=%H|%h|%s|%an|%ct"],
    )
    .ok()?;

    if output.is_empty() {
        return None;
    }

    let parts: Vec<&str> = output.splitn(5, '|').collect();
    if parts.len() != 5 {
        return None;
    }

    Some(CommitInfo {
        hash: parts[0].to_string(),
        short_hash: parts[1].to_string(),
        message: parts[2].to_string(),
        author: parts[3].to_string(),
        timestamp: parts[4].parse().unwrap_or(0),
    })
}

pub fn is_git_repo(path: &str) -> bool {
    Path::new(path).join(".git").exists()
}

pub fn scan_for_repos(root: &str, max_depth: usize) -> Vec<String> {
    use walkdir::WalkDir;
    let mut repos = Vec::new();

    for entry in WalkDir::new(root)
        .max_depth(max_depth)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_dir() {
            let path = entry.path();
            if path.join(".git").exists() {
                repos.push(path.to_string_lossy().to_string());
            }
        }
    }
    repos
}

pub fn stage_files(repo_path: &str, files: &[String]) -> Result<(), String> {
    let mut args = vec!["add", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs.iter());
    Command::new("git")
        .args(&args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn unstage_files(repo_path: &str, files: &[String]) -> Result<(), String> {
    let mut args = vec!["restore", "--staged", "--"];
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(file_refs.iter());
    Command::new("git")
        .args(&args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn discard_file(repo_path: &str, file_path: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["restore", "--", file_path]).map(|_| ())
}

pub fn discard_all(repo_path: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["restore", "."]).map(|_| ())
}

pub fn commit(repo_path: &str, message: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["commit", "-m", message])
}

pub fn amend_commit(repo_path: &str, message: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["commit", "--amend", "-m", message])
}

pub fn push(repo_path: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["push"])
}

pub fn pull(repo_path: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["pull"])
}

pub fn fetch(repo_path: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["fetch", "--prune"])
}

pub fn push_force(repo_path: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["push", "--force-with-lease"])
}

pub fn clone_repo(url: &str, destination: &str) -> Result<String, String> {
    let parent = std::path::Path::new(destination)
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let output = Command::new("git")
        .args(["clone", url, destination])
        .current_dir(parent)
        .output()
        .map_err(|e| e.to_string())?;
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if output.status.success() {
        Ok(stdout)
    } else {
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

pub fn get_file_diff(repo_path: &str, file_path: &str, staged: bool) -> Result<String, String> {
    let mut args = vec!["diff"];
    if staged {
        args.push("--cached");
    }
    args.push("--");
    args.push(file_path);
    run_git(repo_path, &args)
}

// --- Branch management ---

pub fn list_branches(repo_path: &str) -> Result<Vec<BranchInfo>, String> {
    let output = run_git(repo_path, &["branch", "-a", "--format=%(refname:short)|%(HEAD)"])?;
    let mut branches = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(2, '|').collect();
        if parts.len() != 2 {
            continue;
        }
        let name = parts[0].trim().to_string();
        let is_current = parts[1].trim() == "*";
        let is_remote = name.starts_with("origin/");
        // Skip HEAD pointer
        if name == "origin/HEAD" || name.contains("HEAD ->") {
            continue;
        }
        branches.push(BranchInfo { name, is_current, is_remote });
    }

    Ok(branches)
}

pub fn checkout_branch(repo_path: &str, branch: &str) -> Result<(), String> {
    // If it's a remote branch like origin/foo, checkout tracking branch foo
    let local = if let Some(stripped) = branch.strip_prefix("origin/") {
        stripped.to_string()
    } else {
        branch.to_string()
    };
    run_git_checked(repo_path, &["checkout", &local]).map(|_| ())
}

pub fn create_branch(repo_path: &str, name: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["checkout", "-b", name]).map(|_| ())
}

pub fn delete_branch(repo_path: &str, name: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["branch", "-d", name]).map(|_| ())
}

// --- Stash ---

pub fn stash_save(repo_path: &str, message: &str) -> Result<(), String> {
    if message.is_empty() {
        run_git_checked(repo_path, &["stash", "push"]).map(|_| ())
    } else {
        run_git_checked(repo_path, &["stash", "push", "-m", message]).map(|_| ())
    }
}

pub fn stash_pop(repo_path: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["stash", "pop"]).map(|_| ())
}

pub fn stash_drop(repo_path: &str, index: usize) -> Result<(), String> {
    let stash_ref = format!("stash@{{{}}}", index);
    run_git_checked(repo_path, &["stash", "drop", &stash_ref]).map(|_| ())
}

pub fn stash_apply(repo_path: &str, index: usize) -> Result<(), String> {
    let stash_ref = format!("stash@{{{}}}", index);
    run_git_checked(repo_path, &["stash", "apply", &stash_ref]).map(|_| ())
}

pub fn list_stashes(repo_path: &str) -> Result<Vec<StashEntry>, String> {
    let output = run_git(repo_path, &["stash", "list", "--format=%gd|%s"])?;
    let mut stashes = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(2, '|').collect();
        if parts.len() != 2 {
            continue;
        }
        // extract index from "stash@{N}"
        let ref_str = parts[0];
        let index = ref_str
            .trim_start_matches("stash@{")
            .trim_end_matches('}')
            .parse()
            .unwrap_or(0);
        stashes.push(StashEntry {
            index,
            message: parts[1].to_string(),
        });
    }

    Ok(stashes)
}

// --- Commit log ---

pub fn get_log(repo_path: &str, limit: usize) -> Result<Vec<CommitInfo>, String> {
    let limit_str = limit.to_string();
    let output = run_git(
        repo_path,
        &["log", &format!("-{}", limit_str), "--format=%H|%h|%s|%an|%ct"],
    )?;

    let mut commits = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(5, '|').collect();
        if parts.len() != 5 {
            continue;
        }
        commits.push(CommitInfo {
            hash: parts[0].to_string(),
            short_hash: parts[1].to_string(),
            message: parts[2].to_string(),
            author: parts[3].to_string(),
            timestamp: parts[4].parse().unwrap_or(0),
        });
    }

    Ok(commits)
}

pub fn get_commit_diff(repo_path: &str, hash: &str) -> Result<String, String> {
    run_git(repo_path, &["show", "--stat", "-p", hash])
}

pub fn get_file_log(repo_path: &str, file_path: &str, limit: usize) -> Result<Vec<CommitInfo>, String> {
    let limit_str = format!("-{}", limit);
    let output = run_git(
        repo_path,
        &["log", &limit_str, "--follow", "--format=%H|%h|%s|%an|%ct", "--", file_path],
    )?;

    let mut commits = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(5, '|').collect();
        if parts.len() != 5 { continue; }
        commits.push(CommitInfo {
            hash: parts[0].to_string(),
            short_hash: parts[1].to_string(),
            message: parts[2].to_string(),
            author: parts[3].to_string(),
            timestamp: parts[4].parse().unwrap_or(0),
        });
    }
    Ok(commits)
}

pub fn merge_branch(repo_path: &str, branch: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["merge", branch])
}

pub fn rebase_branch(repo_path: &str, branch: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["rebase", branch])
}

pub fn revert_commit(repo_path: &str, hash: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["revert", hash, "--no-edit"])
}

pub fn cherry_pick(repo_path: &str, hash: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["cherry-pick", hash])
}

pub fn force_delete_branch(repo_path: &str, name: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["branch", "-D", name]).map(|_| ())
}

pub fn push_upstream(repo_path: &str, branch: &str) -> Result<String, String> {
    run_git_checked(repo_path, &["push", "--set-upstream", "origin", branch])
}

pub fn list_tags(repo_path: &str) -> Result<Vec<TagInfo>, String> {
    let output = run_git(repo_path, &["tag", "--sort=-version:refname"])?;
    Ok(output.lines()
        .filter(|l| !l.is_empty())
        .map(|l| TagInfo { name: l.to_string() })
        .collect())
}

pub fn create_tag(repo_path: &str, name: &str, message: &str) -> Result<(), String> {
    if message.is_empty() {
        run_git_checked(repo_path, &["tag", name]).map(|_| ())
    } else {
        run_git_checked(repo_path, &["tag", "-a", name, "-m", message]).map(|_| ())
    }
}

pub fn delete_tag(repo_path: &str, name: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["tag", "-d", name]).map(|_| ())
}

pub fn list_remotes(repo_path: &str) -> Result<Vec<RemoteInfo>, String> {
    let output = run_git(repo_path, &["remote", "-v"])?;
    let mut seen = std::collections::HashSet::new();
    let mut remotes = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(2, '\t').collect();
        if parts.len() != 2 { continue; }
        let name = parts[0].trim();
        if seen.contains(name) { continue; }
        seen.insert(name.to_string());
        let url_part = parts[1].trim();
        let url = if let Some(idx) = url_part.rfind(' ') {
            url_part[..idx].trim().to_string()
        } else {
            url_part.to_string()
        };
        remotes.push(RemoteInfo { name: name.to_string(), url });
    }
    Ok(remotes)
}

pub fn add_remote(repo_path: &str, name: &str, url: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["remote", "add", name, url]).map(|_| ())
}

pub fn remove_remote(repo_path: &str, name: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["remote", "remove", name]).map(|_| ())
}

pub fn rename_remote(repo_path: &str, old_name: &str, new_name: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["remote", "rename", old_name, new_name]).map(|_| ())
}

// --- Conflict resolution ---

pub fn resolve_conflict_ours(repo_path: &str, file_path: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["checkout", "--ours", "--", file_path])?;
    run_git_checked(repo_path, &["add", "--", file_path]).map(|_| ())
}

pub fn resolve_conflict_theirs(repo_path: &str, file_path: &str) -> Result<(), String> {
    run_git_checked(repo_path, &["checkout", "--theirs", "--", file_path])?;
    run_git_checked(repo_path, &["add", "--", file_path]).map(|_| ())
}

// --- Gitignore ---

pub fn read_gitignore(repo_path: &str) -> Result<String, String> {
    let path = Path::new(repo_path).join(".gitignore");
    if path.exists() {
        std::fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

pub fn write_gitignore(repo_path: &str, content: &str) -> Result<(), String> {
    let path = Path::new(repo_path).join(".gitignore");
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
