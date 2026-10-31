use serde::Serialize;
use std::{fs, path::PathBuf};

#[derive(Serialize)]
struct ArticleFile { path: String, content: String }

#[tauri::command]
fn open_articles() -> Result<Option<ArticleFile>, String> {
    let Some(path) = rfd::FileDialog::new().add_filter("JSON", &[ "json" ]).pick_file() else { return Ok(None) };
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if content.len() > 8_000_000 { return Err("Filen er for stor for MVP".into()); }
    Ok(Some(ArticleFile { path: path.display().to_string(), content }))
}

#[tauri::command]
fn save_articles_copy(content: String) -> Result<Option<String>, String> {
    if content.len() > 8_000_000 { return Err("Filen er for stor".into()); }
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    if !json.is_array() { return Err("Forventet en JSON-liste".into()); }
    let Some(path) = rfd::FileDialog::new().set_file_name("modus-articles-draft.json").add_filter("JSON", &[ "json" ]).save_file() else { return Ok(None) };
    // MVP writes only a new file. Never silently overwrite an existing source or previous export.
    use std::io::Write;
    let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&path).map_err(|e| format!("Velg et nytt filnavn (ingen overskriving): {e}"))?;
    if let Err(e) = file.write_all(content.as_bytes()) { let _ = fs::remove_file(&path); return Err(e.to_string()); }
    file.sync_all().map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}

pub fn run() {
    tauri::Builder::default().invoke_handler(tauri::generate_handler![open_articles, save_articles_copy]).run(tauri::generate_context!()).expect("Tauri application error");
}
