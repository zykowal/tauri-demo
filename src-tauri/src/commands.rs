use serde::{Deserialize, Serialize};
use tauri::command;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    path: String,
    line_number: u64,
    content: String,
    is_match: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchOptions {
    pattern: String,
    directory: String,
    case_sensitive: bool,
    search_hidden: bool,
    max_depth: u32,
    file_type: Option<String>,
    include_globs: Vec<String>,
    exclude_globs: Vec<String>,
    context_lines: u32,
}

#[command]
pub async fn search_files(
    app: tauri::AppHandle,
    options: SearchOptions,
) -> Result<Vec<SearchResult>, String> {
    if options.max_depth == 0 || options.max_depth > 10 {
        return Err("搜索深度必须在1到10之间".to_string());
    }

    // 先收集所有需要的字符串
    let mut owned_strings = Vec::new();
    
    // 处理排除的文件路径模式
    for glob in &options.exclude_globs {
        if !glob.is_empty() {
            owned_strings.push(format!("!{}", glob));
        }
    }

    // 添加深度字符串
    let depth_str = options.max_depth.to_string();
    owned_strings.push(depth_str);

    // 现在构建参数数组
    let mut args = Vec::new();
    let context_lines_str = options.context_lines.to_string();
    args.extend_from_slice(&["--json", "-H", "-n", "-C", &context_lines_str]);
    
    if !options.case_sensitive {
        args.push("-i");
    }
    
    if options.search_hidden {
        args.extend_from_slice(&["--hidden", "--no-ignore"]);
    }

    // 添加文件类型过滤
    if let Some(file_type) = &options.file_type {
        if !file_type.is_empty() {
            args.extend_from_slice(&["-t", file_type]);
        }
    }

    // 添加包含的文件路径模式
    for glob in &options.include_globs {
        if !glob.is_empty() {
            args.extend_from_slice(&["-g", glob]);
        }
    }

    // 添加排除的文件路径模式
    let exclude_count = options.exclude_globs.iter().filter(|glob| !glob.is_empty()).count();
    for i in 0..exclude_count {
        args.extend_from_slice(&["-g", &owned_strings[i]]);
    }
    
    // 添加深度参数
    args.extend_from_slice(&[
        "--max-depth",
        owned_strings.last().unwrap(),
        &options.pattern,
        &options.directory,
    ]);

    let output = app
        .shell()
        .sidecar("rg")
        .map_err(|e| e.to_string())?
        .args(args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() { continue; }
        
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(line) {
            match value["type"].as_str() {
                Some("match") | Some("context") => {
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
                                is_match: value["type"].as_str() == Some("match"),
                            });
                        }
                    }
                }
                _ => continue,
            }
        }
    }

    // 按文件路径和行号排序，确保上下文行的正确顺序
    results.sort_by(|a, b| {
        match a.path.cmp(&b.path) {
            std::cmp::Ordering::Equal => a.line_number.cmp(&b.line_number),
            other => other,
        }
    });

    log::info!("Final results: {:?}", results);
    Ok(results)
} 
