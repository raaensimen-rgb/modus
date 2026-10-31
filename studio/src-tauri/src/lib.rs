use serde::Serialize;
use std::fs;
use tauri::Manager;
mod unsaved;
use unsaved::{CloseDecision, UnsavedState};

#[tauri::command]
fn set_unsaved_changes(state: tauri::State<'_, UnsavedState>, version: u64, dirty: bool) {
    state.update(version, dirty);
}

enum CloseAction { Quit, Window(String) }
fn request_close(app: &tauri::AppHandle, action: CloseAction, prevent: impl FnOnce()) {
    match app.state::<UnsavedState>().begin_close() {
        CloseDecision::Proceed => {},
        CloseDecision::Wait => prevent(),
        CloseDecision::Prompt(version) => {
            // Block the OS request before opening the native modal dialog.
            prevent();
            let handle = app.clone();
            let scheduled = app.run_on_main_thread(move || {
                let result = rfd::MessageDialog::new()
                    .set_title("Ulagrede endringer i MODUS Studio")
                    .set_description("Artikkelendringene er ikke lagret. Velg Fortsett redigering for å beholde arbeidet og lagre en kopi, eller Forkast og avslutt for å miste endringene.")
                    .set_level(rfd::MessageLevel::Warning)
                    // Keep both default/first action and Cancel safe; only the explicit middle action discards.
                    .set_buttons(rfd::MessageButtons::YesNoCancelCustom(
                        "Fortsett redigering".into(), "Forkast og avslutt".into(), "Avbryt".into()))
                    .show();
                let discard = result == rfd::MessageDialogResult::Custom("Forkast og avslutt".into());
                if handle.state::<UnsavedState>().finish_prompt(version, discard) {
                    match action {
                        CloseAction::Quit => handle.exit(0),
                        CloseAction::Window(label) => {
                            if let Some(window) = handle.get_webview_window(&label) { let _ = window.destroy(); }
                        }
                    }
                }
            });
            if scheduled.is_err() { app.state::<UnsavedState>().finish_prompt(version, false); }
        }
    }
}

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
    tauri::Builder::default()
        .manage(UnsavedState::default())
        .invoke_handler(tauri::generate_handler![open_articles, save_articles_copy, set_unsaved_changes])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                request_close(window.app_handle(), CloseAction::Window(window.label().into()), || api.prevent_close());
            }
        })
        .build(tauri::generate_context!())
        .expect("Tauri application error")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                request_close(app, CloseAction::Quit, || api.prevent_exit());
            }
        });
}
