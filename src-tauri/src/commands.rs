use serde::{Deserialize, Serialize};
use tauri::command;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    path: String,
    line_number: u64,
    content: String,
}

#[command]
pub async fn search_files(
    app: tauri::AppHandle,
    pattern: String,
    directory: String,
) -> Result<Vec<SearchResult>, String> {
    let mut results = Vec::new();
    
    let output = app
        .shell()
        .sidecar("rg")
        .map_err(|e| e.to_string())?
        .args([
            "--json",
            "-r",
            "-H",
            "-n",
            "-i",
            "--hidden",
            "--no-ignore",
            "--max-depth",
            "3",
            &pattern,
            &directory,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| e.to_string())?;

    for line in stdout.lines() {
        if line.is_empty() { continue; }
        
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(line) {
            if value["type"] == "match" {
                if let Some(data) = value.get("data") {
                    if let (Some(path), Some(line_number), Some(lines)) = (
                        data.get("path").and_then(|v| v.get("text")).and_then(|v| v.as_str()),
                        data.get("line_number").and_then(|v| v.as_u64()),
                        data.get("lines").and_then(|v| v.get("text")).and_then(|v| v.as_str()),
                    ) {
                        results.push(SearchResult {
                            path: path.to_string(),
                            line_number,
                            content: lines.to_string(),
                        });
                    }
                }
            }
        }
    }

    log::info!("Final results: {:?}", results);
    Ok(results)
} 
