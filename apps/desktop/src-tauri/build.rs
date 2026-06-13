fn main() {
    // ── Bundle manifest snapshot ──────────────────────────────────────────────
    //
    // Copy *.bundle.json files from the sibling shipyard fleet layout into
    // `resources/bundles/` so the built .app is self-contained and does not
    // require a shipyard clone at runtime.
    //
    // The copy runs only when:
    //   (a) the source directory exists (i.e. the developer has shipyard cloned),
    //   AND (b) the source files are newer than the bundled copies.
    //
    // When shipyard is not present (operator machine, CI without the fleet
    // monorepo), the existing `resources/bundles/` snapshot is used as-is.
    // Cargo will not fail the build if the source is absent.
    //
    // To refresh the bundled snapshot manually:
    //   cd apps/desktop/src-tauri && touch resources/bundles/.refresh && cargo build

    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let resource_dest = std::path::PathBuf::from(&manifest_dir).join("resources").join("bundles");

    // Locate shipyard relative to `tender/apps/desktop/src-tauri/` (4 ups = fleet root)
    let fleet_root = std::path::PathBuf::from(&manifest_dir)
        .join("..").join("..").join("..").join("..");
    let shipyard_bundles = fleet_root
        .join("shipyard")
        .join("packages")
        .join("foundation-catalog")
        .join("Manifests")
        .join("Bundles");

    if shipyard_bundles.exists() {
        std::fs::create_dir_all(&resource_dest)
            .expect("failed to create resources/bundles/");

        if let Ok(entries) = std::fs::read_dir(&shipyard_bundles) {
            for entry in entries.flatten() {
                let src = entry.path();
                let name = match src.file_name() {
                    Some(n) => n,
                    None => continue,
                };
                let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("");
                let stem = src.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                if ext != "json" || !stem.ends_with(".bundle") {
                    continue;
                }
                let dst = resource_dest.join(name);
                // Only copy when source is newer (best-effort; copy if metadata unavailable)
                let should_copy = dst.exists().then(|| {
                    let src_mtime = src.metadata().and_then(|m| m.modified()).ok();
                    let dst_mtime = dst.metadata().and_then(|m| m.modified()).ok();
                    match (src_mtime, dst_mtime) {
                        (Some(s), Some(d)) => s > d,
                        _ => true,
                    }
                }).unwrap_or(true);

                if should_copy {
                    let _ = std::fs::copy(&src, &dst);
                }
            }
        }

        // Re-run if any source manifest changes
        println!("cargo:rerun-if-changed={}", shipyard_bundles.display());
    }

    // Tauri mandatory build step
    tauri_build::build()
}
