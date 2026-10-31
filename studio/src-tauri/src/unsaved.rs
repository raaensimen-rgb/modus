use std::sync::Mutex;

#[derive(Default)]
struct Snapshot { version: u64, dirty: bool, prompting: bool }
#[derive(Default)]
pub struct UnsavedState(Mutex<Snapshot>);
#[derive(Debug, PartialEq)]
pub enum CloseDecision { Proceed, Wait, Prompt(u64) }
impl UnsavedState {
    pub fn update(&self, version: u64, dirty: bool) {
        let mut state = self.0.lock().unwrap_or_else(|e| e.into_inner());
        // IPC responses may arrive out of order. An old saved state must not clear a newer edit.
        if version > state.version { state.version = version; state.dirty = dirty; }
    }
    pub fn begin_close(&self) -> CloseDecision {
        let mut state = self.0.lock().unwrap_or_else(|e| e.into_inner());
        if state.prompting { return CloseDecision::Wait; }
        if !state.dirty { return CloseDecision::Proceed; }
        state.prompting = true;
        CloseDecision::Prompt(state.version)
    }
    pub fn finish_prompt(&self, version: u64, discard: bool) -> bool {
        let mut state = self.0.lock().unwrap_or_else(|e| e.into_inner());
        state.prompting = false;
        // Never approve discarding an edit that arrived while the dialog was open.
        if discard && state.version == version { state.dirty = false; true } else { false }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn clean_document_can_close() { assert_eq!(UnsavedState::default().begin_close(), CloseDecision::Proceed); }
    #[test] fn dirty_document_requires_prompt() { let s=UnsavedState::default(); s.update(1,true); assert_eq!(s.begin_close(),CloseDecision::Prompt(1)); }
    #[test] fn cancel_keeps_dirty_document_open() { let s=UnsavedState::default(); s.update(1,true); s.begin_close(); assert!(!s.finish_prompt(1,false)); assert_eq!(s.begin_close(),CloseDecision::Prompt(1)); }
    #[test] fn explicit_discard_allows_next_exit_without_second_prompt() { let s=UnsavedState::default(); s.update(1,true); s.begin_close(); assert!(s.finish_prompt(1,true)); assert_eq!(s.begin_close(),CloseDecision::Proceed); }
    #[test] fn duplicate_requests_do_not_stack_dialogs() { let s=UnsavedState::default(); s.update(1,true); s.begin_close(); assert_eq!(s.begin_close(),CloseDecision::Wait); }
    #[test] fn stale_saved_update_does_not_clear_new_edit() { let s=UnsavedState::default(); s.update(3,true); s.update(2,false); assert_eq!(s.begin_close(),CloseDecision::Prompt(3)); }
    #[test] fn latest_successful_save_allows_close() { let s=UnsavedState::default(); s.update(1,true); s.update(2,false); assert_eq!(s.begin_close(),CloseDecision::Proceed); }
    #[test] fn edits_during_prompt_invalidate_discard_approval() { let s=UnsavedState::default(); s.update(1,true); s.begin_close(); s.update(2,true); assert!(!s.finish_prompt(1,true)); assert_eq!(s.begin_close(),CloseDecision::Prompt(2)); }
}
