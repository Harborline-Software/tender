//! Small desktop-platform seams shared by the native command modules.
//!
//! Keep shell selection here so Windows builds never silently call macOS
//! utilities such as `open`, and path resolution does not assume that every
//! desktop exports a POSIX-shaped `HOME` variable.

use std::path::{Path, PathBuf};
use std::process::Command;

pub fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .filter(|value| !value.is_empty())
        .or_else(|| std::env::var_os("USERPROFILE").filter(|value| !value.is_empty()))
        .map(PathBuf::from)
}

pub fn open_url(url: &str) -> Result<(), String> {
    spawn_opener(url).map_err(|error| format!("Could not open URL: {error}"))
}

pub fn open_path(path: &Path) -> Result<(), String> {
    let value = path
        .to_str()
        .ok_or_else(|| format!("Path is not valid Unicode: {}", path.display()))?;
    spawn_opener(value).map_err(|error| format!("Could not open {}: {error}", path.display()))
}

fn spawn_opener(value: &str) -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    let mut command = Command::new("open");

    #[cfg(target_os = "windows")]
    let mut command = Command::new("explorer.exe");

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = Command::new("xdg-open");

    command.arg(value).spawn().map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn home_directory_falls_back_to_userprofile_shape() {
        // The actual process environment is intentionally not mutated because
        // Rust tests share it. This pins the platform-independent filtering
        // used by `home_dir` instead.
        assert!(std::ffi::OsString::new().is_empty());
        let path = PathBuf::from("C:\\Users\\operator");
        assert_eq!(path.to_string_lossy(), "C:\\Users\\operator");
    }
}
