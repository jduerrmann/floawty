//! The shared block every process of a run maps: handshake reports, hotkey table, counters.
use std::marker::PhantomData;
use std::ptr::{addr_of, addr_of_mut};
use std::sync::atomic::{AtomicU32, Ordering};

use windows_sys::Win32::Foundation::{
    CloseHandle, HANDLE, INVALID_HANDLE_VALUE, WAIT_ABANDONED, WAIT_OBJECT_0,
};
use windows_sys::Win32::System::Memory::{
    CreateFileMappingW, MapViewOfFile, OpenFileMappingW, UnmapViewOfFile, FILE_MAP_ALL_ACCESS,
    MEMORY_MAPPED_VIEW_ADDRESS, PAGE_READWRITE,
};
use windows_sys::Win32::System::Threading::{
    CreateMutexW, OpenMutexW, ReleaseMutex, WaitForSingleObject, MUTEX_ALL_ACCESS,
};

use crate::handshake::{Handshake, STATE_VERSION};
use crate::input::Input;
use crate::process::{os_error, wide};
use crate::table::HotkeyTable;

/// Names the block for children; floawty processes inherit it with their environment.
pub const ENV_NAME: &str = "FLOAWTY_TEST_INPUT";
pub const MAX_CHILDREN: usize = 64;
pub const HANDSHAKE_SLOTS: usize = 64;
const ERROR_TEXT: usize = 192;
const LOCK_TIMEOUT_MS: u32 = 5000;

#[repr(C)]
struct Header {
    version: u32,
}

/// Everything the mutex guards. Header and these slots never move; later fields are appended.
#[repr(C)]
pub struct Locked {
    pub slots: [Handshake; HANDSHAKE_SLOTS],
    pub table: HotkeyTable,
    child_error: [u8; ERROR_TEXT],
    pub input: Input,
}

#[repr(C)]
struct State {
    header: Header,
    locked: Locked,
    send_input: AtomicU32,
    shell_execute: AtomicU32,
    child_count: AtomicU32,
    children: [AtomicU32; MAX_CHILDREN],
}

/// A kernel handle that is closed with its owner.
struct Owned(HANDLE);

impl Owned {
    /// Takes the result of the call that just returned, while its error is still the last one.
    fn new(raw: HANDLE, verb: &str, name: &str) -> Result<Owned, String> {
        match raw.is_null() {
            true => Err(os_error(&format!(
                "cannot {verb} the test input state {name}"
            ))),
            false => Ok(Owned(raw)),
        }
    }
}

impl Drop for Owned {
    fn drop(&mut self) {
        // SAFETY: the handle belongs to this value and is closed once.
        unsafe { CloseHandle(self.0) };
    }
}

pub struct Shared {
    state: *mut State,
    _mapping: Owned,
    mutex: Owned,
}

// SAFETY: the mapped block is only changed through atomics or while the mutex is held.
unsafe impl Send for Shared {}
unsafe impl Sync for Shared {}

impl Drop for Shared {
    fn drop(&mut self) {
        // SAFETY: the view belongs to this value and is released once, before the handles close.
        unsafe {
            UnmapViewOfFile(MEMORY_MAPPED_VIEW_ADDRESS {
                Value: self.state.cast(),
            })
        };
    }
}

/// Holds the cross-process lock; it must be released by the thread that took it.
pub struct Guard<'a> {
    shared: &'a Shared,
    _same_thread: PhantomData<*const ()>,
}

impl Shared {
    pub fn create(name: &str) -> Result<Shared, String> {
        let (mapping_name, mutex_name) = (wide(name), wide(&lock_name(name)));
        let size = std::mem::size_of::<State>() as u32;
        // SAFETY: plain object creation with a valid, NUL-terminated wide name.
        let mapping = unsafe {
            CreateFileMappingW(
                INVALID_HANDLE_VALUE,
                std::ptr::null(),
                PAGE_READWRITE,
                0,
                size,
                mapping_name.as_ptr(),
            )
        };
        let mapping = Owned::new(mapping, "create", name)?;
        // SAFETY: as above.
        let mutex = unsafe { CreateMutexW(std::ptr::null(), 0, mutex_name.as_ptr()) };
        let shared = Self::map(mapping, Owned::new(mutex, "create", name)?, name)?;
        // SAFETY: the block is mapped, zeroed and still private to this process.
        unsafe { addr_of_mut!((*shared.state).header.version).write(STATE_VERSION) };
        Ok(shared)
    }

    pub fn open(name: &str) -> Result<Shared, String> {
        let (mapping_name, mutex_name) = (wide(name), wide(&lock_name(name)));
        // SAFETY: plain object lookup with a valid, NUL-terminated wide name.
        let mapping = unsafe { OpenFileMappingW(FILE_MAP_ALL_ACCESS, 0, mapping_name.as_ptr()) };
        let mapping = Owned::new(mapping, "open", name)?;
        // SAFETY: as above.
        let mutex = unsafe { OpenMutexW(MUTEX_ALL_ACCESS, 0, mutex_name.as_ptr()) };
        Self::map(mapping, Owned::new(mutex, "open", name)?, name)
    }

    fn map(mapping: Owned, mutex: Owned, name: &str) -> Result<Shared, String> {
        // SAFETY: maps the whole block of a handle that was just checked.
        let view = unsafe { MapViewOfFile(mapping.0, FILE_MAP_ALL_ACCESS, 0, 0, 0) };
        if view.Value.is_null() {
            return Err(os_error(&format!("cannot map the test input state {name}")));
        }
        Ok(Shared {
            state: view.Value.cast(),
            _mapping: mapping,
            mutex,
        })
    }

    /// The version the launcher that created the block was built with.
    pub fn header_version(&self) -> u32 {
        // SAFETY: written once at creation, before any other process could open the block.
        unsafe { addr_of!((*self.state).header.version).read_volatile() }
    }

    pub fn lock(&self) -> Result<Guard<'_>, String> {
        // SAFETY: waits on a mutex handle this value owns.
        let waited = unsafe { WaitForSingleObject(self.mutex.0, LOCK_TIMEOUT_MS) };
        // A holder that died leaves its small update half done at worst; the next owner goes on.
        match waited {
            WAIT_OBJECT_0 | WAIT_ABANDONED => Ok(Guard {
                shared: self,
                _same_thread: PhantomData,
            }),
            _ => Err("timed out waiting for the test input state lock".to_string()),
        }
    }

    pub fn add_send_input(&self) {
        // SAFETY: only the atomic field is referenced, never the whole block other processes change.
        unsafe { &*addr_of!((*self.state).send_input) }.fetch_add(1, Ordering::SeqCst);
    }

    pub fn add_shell_execute(&self) {
        // SAFETY: as in add_send_input.
        unsafe { &*addr_of!((*self.state).shell_execute) }.fetch_add(1, Ordering::SeqCst);
    }

    /// The calls swallowed so far: (`SendInput`, `ShellExecuteW`).
    pub fn counts(&self) -> (u32, u32) {
        // SAFETY: as in add_send_input.
        let (send_input, shell_execute) = unsafe {
            (
                &*addr_of!((*self.state).send_input),
                &*addr_of!((*self.state).shell_execute),
            )
        };
        (
            send_input.load(Ordering::SeqCst),
            shell_execute.load(Ordering::SeqCst),
        )
    }

    pub fn record_child(&self, pid: u32) {
        // SAFETY: only the atomic fields are referenced.
        let (count, children) = unsafe {
            (
                &*addr_of!((*self.state).child_count),
                &*addr_of!((*self.state).children),
            )
        };
        let index = count.fetch_add(1, Ordering::SeqCst) as usize;
        if let Some(slot) = children.get(index) {
            slot.store(pid, Ordering::SeqCst);
        }
    }

    /// The children floawty started, in order; a slot filled a moment late ends the list.
    pub fn children(&self) -> Vec<u32> {
        // SAFETY: only the atomic fields are referenced.
        let (count, children) = unsafe {
            (
                &*addr_of!((*self.state).child_count),
                &*addr_of!((*self.state).children),
            )
        };
        let recorded = (count.load(Ordering::SeqCst) as usize).min(MAX_CHILDREN);
        let pids = children[..recorded].iter();
        pids.map(|pid| pid.load(Ordering::SeqCst))
            .take_while(|pid| *pid != 0)
            .collect()
    }

    pub fn report_child_error(&self, text: &str) -> Result<(), String> {
        let mut guard = self.lock()?;
        let mut end = text.len().min(ERROR_TEXT - 1);
        while !text.is_char_boundary(end) {
            end -= 1;
        }
        guard.child_error = [0; ERROR_TEXT];
        guard.child_error[..end].copy_from_slice(&text.as_bytes()[..end]);
        Ok(())
    }

    /// The newest cause of a child that failed to start; it stays until a newer one replaces it.
    pub fn child_error(&self) -> Option<String> {
        let guard = self.lock().ok()?;
        let bytes = &guard.child_error;
        let length = bytes
            .iter()
            .position(|byte| *byte == 0)
            .unwrap_or(ERROR_TEXT);
        (length > 0).then(|| String::from_utf8_lossy(&bytes[..length]).into_owned())
    }
}

fn lock_name(name: &str) -> String {
    format!("{name}-lock")
}

impl std::ops::Deref for Guard<'_> {
    type Target = Locked;
    fn deref(&self) -> &Locked {
        // SAFETY: the guard holds the lock, so no other process writes this part.
        unsafe { &*addr_of!((*self.shared.state).locked) }
    }
}

impl std::ops::DerefMut for Guard<'_> {
    fn deref_mut(&mut self) -> &mut Locked {
        // SAFETY: the guard holds the lock, so this is the only writer.
        unsafe { &mut *addr_of_mut!((*self.shared.state).locked) }
    }
}

impl Drop for Guard<'_> {
    fn drop(&mut self) {
        // SAFETY: released by the thread that took the lock.
        unsafe { ReleaseMutex(self.shared.mutex.0) };
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hotkey_text::{Combo, MOD_ALT};
    use crate::input::Foreground;
    use crate::table::Owner;

    const COMBO: Combo = Combo {
        mods: MOD_ALT,
        vk: 0x54,
    };

    fn unique_name() -> String {
        static NEXT: AtomicU32 = AtomicU32::new(0);
        let n = NEXT.fetch_add(1, Ordering::Relaxed);
        format!("Local\\floawty-test-input-unit-{}-{n}", std::process::id())
    }

    fn pair() -> (Shared, Shared) {
        let name = unique_name();
        (Shared::create(&name).unwrap(), Shared::open(&name).unwrap())
    }

    #[test]
    fn a_block_opened_by_name_has_the_creators_version() {
        let (created, opened) = pair();
        assert_eq!(created.header_version(), STATE_VERSION);
        assert_eq!(opened.header_version(), STATE_VERSION);
    }

    #[test]
    fn opening_an_unknown_block_names_the_cause() {
        let error = Shared::open(&unique_name()).err().unwrap();
        assert!(error.contains("open"), "{error}");
    }

    #[test]
    fn the_hotkey_table_is_one_table_for_both_handles() {
        let (first, second) = pair();
        let owner = Owner {
            pid: std::process::id(),
            tid: 1,
            hwnd: 0x10,
        };
        first
            .lock()
            .unwrap()
            .table
            .register(owner, 7, COMBO, &|_| true)
            .unwrap();
        let found = second.lock().unwrap().table.find(COMBO, &|_| true);
        assert_eq!(found.map(|entry| entry.id), Some(7));
    }

    #[test]
    fn the_lock_keeps_threads_from_writing_at_once() {
        let name = unique_name();
        let created = Shared::create(&name).unwrap();
        let threads: Vec<_> = (0..4)
            .map(|_| {
                let name = name.clone();
                std::thread::spawn(move || {
                    let shared = Shared::open(&name).unwrap();
                    for _ in 0..500 {
                        shared.lock().unwrap().slots[0].patched += 1;
                    }
                })
            })
            .collect();
        threads
            .into_iter()
            .for_each(|thread| thread.join().unwrap());
        assert_eq!(created.lock().unwrap().slots[0].patched, 2000);
    }

    #[test]
    fn swallowed_calls_are_counted_across_handles() {
        let (first, second) = pair();
        first.add_send_input();
        first.add_send_input();
        second.add_shell_execute();
        assert_eq!(first.counts(), (2, 1));
        assert_eq!(second.counts(), (2, 1));
    }

    #[test]
    fn children_are_listed_in_the_order_they_were_recorded() {
        let (first, second) = pair();
        assert!(first.children().is_empty());
        first.record_child(11);
        second.record_child(22);
        assert_eq!(first.children(), vec![11, 22]);
        assert_eq!(second.children(), vec![11, 22]);
    }

    #[test]
    fn the_newest_child_error_stays_until_replaced() {
        let (first, second) = pair();
        assert_eq!(second.child_error(), None);
        first.report_child_error("shim did not load").unwrap();
        assert_eq!(second.child_error().as_deref(), Some("shim did not load"));
        assert_eq!(second.child_error().as_deref(), Some("shim did not load"));
        first.report_child_error("second").unwrap();
        assert_eq!(second.child_error().as_deref(), Some("second"));
    }

    #[test]
    fn a_long_child_error_is_cut_not_refused() {
        let (first, second) = pair();
        first.report_child_error(&"x".repeat(1000)).unwrap();
        let text = second.child_error().unwrap();
        assert!(!text.is_empty() && text.len() < 1000);
    }

    #[test]
    fn the_input_starts_with_floawty_in_front_and_is_one_state_for_both_handles() {
        let (first, second) = pair();
        assert_eq!(second.lock().unwrap().input.foreground(), Foreground::Main);
        assert_eq!(second.lock().unwrap().input.cursor(), None);
        first.lock().unwrap().input.set_cursor(Some((-5, 7)));
        first
            .lock()
            .unwrap()
            .input
            .set_foreground(Foreground::Other);
        assert_eq!(second.lock().unwrap().input.cursor(), Some((-5, 7)));
        assert_eq!(second.lock().unwrap().input.foreground(), Foreground::Other);
    }
}
