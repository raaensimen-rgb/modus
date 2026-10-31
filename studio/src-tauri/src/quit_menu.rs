use tauri::menu::Menu;

const QUIT_ID: &str = "studio-guarded-quit";

pub fn build(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::default(app)?;
    #[cfg(target_os = "macos")]
    {
        use tauri::menu::{MenuItem, PredefinedMenuItem};
        // macOS's predefined Quit calls terminate: directly, bypassing ExitRequested.
        // Replace only that item; keep native Edit/Services/Window menus intact.
        let items = menu.items()?;
        let app_menu = items.first().and_then(|item| item.as_submenu())
            .ok_or_else(|| std::io::Error::other("Missing macOS application menu"))?;
        let entries = app_menu.items()?;
        let expected_quit = PredefinedMenuItem::quit(app, None)?.text()?;
        let last = entries.last().and_then(|item| item.as_predefined_menuitem())
            .ok_or_else(|| std::io::Error::other("Missing native Quit item"))?;
        if last.text()? != expected_quit {
            return Err(std::io::Error::other("Unexpected native Quit item").into());
        }
        app_menu.remove_at(entries.len() - 1)?;
        app_menu.append(&MenuItem::with_id(app, QUIT_ID, "Avslutt MODUS Studio", true, Some("CmdOrCtrl+Q"))?)?;
    }
    Ok(menu)
}

// Shared by the actual native menu event handler and routing tests. Never exit
// on the menu event until the close guard explicitly permits it.
pub fn route(id: &str, request_close: impl FnOnce() -> bool, exit: impl FnOnce()) {
    if id == QUIT_ID && request_close() { exit(); }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::unsaved::{CloseDecision, UnsavedState};
    use std::cell::Cell;

    #[test]
    fn dirty_quit_menu_cannot_exit_until_explicit_discard() {
        let state = UnsavedState::default();
        let exited = Cell::new(false);
        state.update(1, true);
        route(QUIT_ID, || state.begin_close() == CloseDecision::Proceed, || exited.set(true));
        assert!(!exited.get());
        assert!(!state.finish_prompt(1, false)); // Continue editing / Cancel
        route(QUIT_ID, || state.begin_close() == CloseDecision::Proceed, || exited.set(true));
        assert!(!exited.get());
        assert!(state.finish_prompt(1, true));
        route(QUIT_ID, || state.begin_close() == CloseDecision::Proceed, || exited.set(true));
        assert!(exited.get());
    }

    #[test]
    fn clean_quit_menu_exits_once() {
        let exits = Cell::new(0);
        let state = UnsavedState::default();
        route(QUIT_ID, || state.begin_close() == CloseDecision::Proceed, || exits.set(exits.get() + 1));
        assert_eq!(exits.get(), 1);
    }

    #[test]
    fn edit_menu_does_not_request_close() {
        route("copy", || panic!("Edit must not request close"), || panic!("Edit must not quit"));
    }
}
