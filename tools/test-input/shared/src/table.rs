//! The hotkey table all floawty processes of a run share instead of Windows' session-wide one.
use crate::hotkey_text::Combo;

pub const CAPACITY: usize = 128;
const FREE: u32 = 0;
const REGISTERED: u32 = 1;
const HELD: u32 = 2;

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Entry {
    kind: u32,
    pub pid: u32,
    pub tid: u32,
    pub id: i32,
    pub hwnd: u64,
    pub mods: u32,
    pub vk: u32,
}

/// Who registers: the process, its thread and the window that receives `WM_HOTKEY`.
#[derive(Clone, Copy, Debug)]
pub struct Owner {
    pub pid: u32,
    pub tid: u32,
    pub hwnd: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub enum HotkeyError {
    Taken,
    NotFound,
    Full,
}

#[repr(C)]
pub struct HotkeyTable {
    entries: [Entry; CAPACITY],
}

impl HotkeyTable {
    pub const fn new() -> Self {
        let free = Entry {
            kind: FREE,
            pid: 0,
            tid: 0,
            id: 0,
            hwnd: 0,
            mods: 0,
            vk: 0,
        };
        Self {
            entries: [free; CAPACITY],
        }
    }

    pub fn register(
        &mut self,
        owner: Owner,
        id: i32,
        combo: Combo,
        is_live: &dyn Fn(&Entry) -> bool,
    ) -> Result<(), HotkeyError> {
        let entry = Entry {
            kind: REGISTERED,
            pid: owner.pid,
            tid: owner.tid,
            id,
            hwnd: owner.hwnd,
            mods: combo.mods,
            vk: combo.vk,
        };
        self.insert(entry, is_live)
    }

    pub fn unregister(&mut self, hwnd: u64, tid: u32, id: i32) -> Result<(), HotkeyError> {
        let owned = |entry: &&mut Entry| {
            entry.kind == REGISTERED
                && entry.hwnd == hwnd
                && entry.id == id
                && (hwnd != 0 || entry.tid == tid)
        };
        let entry = self
            .entries
            .iter_mut()
            .find(owned)
            .ok_or(HotkeyError::NotFound)?;
        entry.kind = FREE;
        Ok(())
    }

    /// Marks a combination as held by an app outside the test.
    pub fn hold(
        &mut self,
        combo: Combo,
        is_live: &dyn Fn(&Entry) -> bool,
    ) -> Result<(), HotkeyError> {
        let held = Entry {
            kind: HELD,
            pid: 0,
            tid: 0,
            id: 0,
            hwnd: 0,
            mods: combo.mods,
            vk: combo.vk,
        };
        self.insert(held, is_live)
    }

    pub fn release(&mut self, combo: Combo) -> Result<(), HotkeyError> {
        let held = |entry: &&mut Entry| entry.kind == HELD && same_combo(entry, combo);
        let entry = self
            .entries
            .iter_mut()
            .find(held)
            .ok_or(HotkeyError::NotFound)?;
        entry.kind = FREE;
        Ok(())
    }

    /// The live registration of a combination, as a press has to find it.
    pub fn find(&mut self, combo: Combo, is_live: &dyn Fn(&Entry) -> bool) -> Option<Entry> {
        self.forget_exited(combo, is_live);
        let registered = |entry: &&Entry| entry.kind == REGISTERED && same_combo(entry, combo);
        self.entries.iter().find(registered).copied()
    }

    fn insert(
        &mut self,
        entry: Entry,
        is_live: &dyn Fn(&Entry) -> bool,
    ) -> Result<(), HotkeyError> {
        let combo = Combo {
            mods: entry.mods,
            vk: entry.vk,
        };
        self.forget_exited(combo, is_live);
        if self
            .entries
            .iter()
            .any(|taken| taken.kind != FREE && same_combo(taken, combo))
        {
            return Err(HotkeyError::Taken);
        }
        let slot = self.entries.iter_mut().find(|slot| slot.kind == FREE);
        *slot.ok_or(HotkeyError::Full)? = entry;
        Ok(())
    }

    /// Windows drops a hotkey with its window; here the table drops it when the owner is gone.
    fn forget_exited(&mut self, combo: Combo, is_live: &dyn Fn(&Entry) -> bool) {
        for entry in &mut self.entries {
            if entry.kind == REGISTERED && same_combo(entry, combo) && !is_live(entry) {
                entry.kind = FREE;
            }
        }
    }
}

fn same_combo(entry: &Entry, combo: Combo) -> bool {
    entry.mods == combo.mods && entry.vk == combo.vk
}

impl Default for HotkeyTable {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hotkey_text::{MOD_ALT, MOD_CONTROL};

    const CTRL_ALT_T: Combo = Combo {
        mods: MOD_CONTROL | MOD_ALT,
        vk: 0x54,
    };
    const CTRL_ALT_O: Combo = Combo {
        mods: MOD_CONTROL | MOD_ALT,
        vk: 0x4F,
    };
    const FIRST: Owner = Owner {
        pid: 100,
        tid: 1,
        hwnd: 0x10,
    };
    const SECOND: Owner = Owner {
        pid: 200,
        tid: 2,
        hwnd: 0x20,
    };

    fn alive(_: &Entry) -> bool {
        true
    }

    fn registered(table: &mut HotkeyTable, owner: Owner, id: i32, combo: Combo) {
        table.register(owner, id, combo, &alive).unwrap();
    }

    #[test]
    fn a_registered_combination_is_found_with_its_window_and_id() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        let entry = table.find(CTRL_ALT_T, &alive).unwrap();
        assert_eq!((entry.pid, entry.hwnd, entry.id), (100, 0x10, 7));
        assert!(table.find(CTRL_ALT_O, &alive).is_none());
    }

    #[test]
    fn the_same_combination_is_refused_for_any_window() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        assert_eq!(
            table.register(SECOND, 9, CTRL_ALT_T, &alive),
            Err(HotkeyError::Taken)
        );
        assert_eq!(
            table.register(FIRST, 7, CTRL_ALT_T, &alive),
            Err(HotkeyError::Taken)
        );
    }

    #[test]
    fn one_window_and_id_may_hold_two_combinations() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        assert_eq!(table.register(FIRST, 7, CTRL_ALT_O, &alive), Ok(()));
    }

    #[test]
    fn a_combination_held_by_another_app_is_refused() {
        let mut table = HotkeyTable::new();
        table.hold(CTRL_ALT_T, &alive).unwrap();
        assert_eq!(
            table.register(FIRST, 7, CTRL_ALT_T, &alive),
            Err(HotkeyError::Taken)
        );
        assert!(table.find(CTRL_ALT_T, &alive).is_none());
    }

    #[test]
    fn releasing_a_held_combination_frees_it() {
        let mut table = HotkeyTable::new();
        table.hold(CTRL_ALT_T, &alive).unwrap();
        table.release(CTRL_ALT_T).unwrap();
        assert_eq!(table.register(FIRST, 7, CTRL_ALT_T, &alive), Ok(()));
        assert_eq!(table.release(CTRL_ALT_T), Err(HotkeyError::NotFound));
    }

    #[test]
    fn a_taken_or_held_combination_cannot_be_held_again() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        assert_eq!(table.hold(CTRL_ALT_T, &alive), Err(HotkeyError::Taken));
        table.hold(CTRL_ALT_O, &alive).unwrap();
        assert_eq!(table.hold(CTRL_ALT_O, &alive), Err(HotkeyError::Taken));
    }

    #[test]
    fn unregister_removes_by_window_and_id_and_frees_the_combination() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        assert_eq!(table.unregister(0x10, 1, 7), Ok(()));
        assert!(table.find(CTRL_ALT_T, &alive).is_none());
        assert_eq!(table.register(SECOND, 9, CTRL_ALT_T, &alive), Ok(()));
    }

    #[test]
    fn unregister_of_an_unknown_registration_fails() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        assert_eq!(table.unregister(0x10, 1, 8), Err(HotkeyError::NotFound));
        assert_eq!(table.unregister(0x99, 1, 7), Err(HotkeyError::NotFound));
    }

    #[test]
    fn unregister_never_touches_a_held_combination() {
        let mut table = HotkeyTable::new();
        table.hold(CTRL_ALT_T, &alive).unwrap();
        assert_eq!(table.unregister(0, 0, 0), Err(HotkeyError::NotFound));
        assert_eq!(
            table.register(FIRST, 7, CTRL_ALT_T, &alive),
            Err(HotkeyError::Taken)
        );
    }

    #[test]
    fn a_registration_without_a_window_belongs_to_its_thread() {
        let mut table = HotkeyTable::new();
        let thread = Owner {
            pid: 100,
            tid: 5,
            hwnd: 0,
        };
        registered(&mut table, thread, 1, CTRL_ALT_T);
        assert_eq!(table.unregister(0, 6, 1), Err(HotkeyError::NotFound));
        assert_eq!(table.unregister(0, 5, 1), Ok(()));
    }

    #[test]
    fn two_processes_keep_their_own_entries() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        registered(&mut table, SECOND, 7, CTRL_ALT_O);
        assert_eq!(table.find(CTRL_ALT_T, &alive).unwrap().pid, 100);
        assert_eq!(table.find(CTRL_ALT_O, &alive).unwrap().pid, 200);
        table.unregister(0x10, 1, 7).unwrap();
        assert!(table.find(CTRL_ALT_T, &alive).is_none());
        assert_eq!(table.find(CTRL_ALT_O, &alive).unwrap().pid, 200);
    }

    #[test]
    fn an_exited_process_does_not_block_its_combination() {
        let mut table = HotkeyTable::new();
        registered(&mut table, FIRST, 7, CTRL_ALT_T);
        let first_exited = |entry: &Entry| entry.pid != 100;
        assert!(table.find(CTRL_ALT_T, &first_exited).is_none());
        assert_eq!(table.register(SECOND, 9, CTRL_ALT_T, &first_exited), Ok(()));
        assert_eq!(table.find(CTRL_ALT_T, &alive).unwrap().pid, 200);
    }

    #[test]
    fn a_full_table_refuses_a_new_registration() {
        let mut table = HotkeyTable::new();
        for vk in 0..CAPACITY as u32 {
            registered(&mut table, FIRST, vk as i32, Combo { mods: MOD_ALT, vk });
        }
        let one_more = Combo {
            mods: MOD_ALT,
            vk: 0xFF,
        };
        assert_eq!(
            table.register(FIRST, 999, one_more, &alive),
            Err(HotkeyError::Full)
        );
    }
}
