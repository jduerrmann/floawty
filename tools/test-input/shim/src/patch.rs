//! Rewrites entries of the exe's own import table; other modules keep the real functions.
#[cfg(not(target_pointer_width = "64"))]
compile_error!("the import table walk below reads 64-bit PE images only");

use std::ffi::{c_char, c_void, CStr};

use windows_sys::Win32::System::Diagnostics::Debug::{
    IMAGE_DIRECTORY_ENTRY_IMPORT, IMAGE_NT_HEADERS64,
};
use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
use windows_sys::Win32::System::Memory::{VirtualProtect, PAGE_READWRITE};
use windows_sys::Win32::System::SystemServices::{IMAGE_DOS_HEADER, IMAGE_IMPORT_DESCRIPTOR};

/// A name thunk with this bit set imports by ordinal and has no name to match.
const ORDINAL_FLAG: u64 = 1 << 63;
/// A by-name thunk points at a 2-byte hint followed by the function name.
const HINT_SIZE: usize = 2;

/// One import to replace: the DLL and function it is imported by, and what to call instead.
pub struct ImportPatch {
    pub bit: u32,
    pub dll: &'static str,
    pub function: &'static str,
    pub replacement: usize,
}

/// Patches the process's main module and returns the `bit`s of the imports it found and replaced.
pub fn patch_main_module(patches: &[ImportPatch]) -> u32 {
    // SAFETY: the main module is mapped for the life of the process; a null name asks for it.
    let base = unsafe { GetModuleHandleW(std::ptr::null()) } as *const u8;
    // SAFETY: base is a loaded PE image, so its headers and import directory are readable.
    unsafe { patch_module(base, patches) }
}

/// # Safety
/// `base` must be the base address of a loaded 64-bit PE image.
unsafe fn patch_module(base: *const u8, patches: &[ImportPatch]) -> u32 {
    let dos = &*(base as *const IMAGE_DOS_HEADER);
    let nt = &*(base.add(dos.e_lfanew as usize) as *const IMAGE_NT_HEADERS64);
    let directory = nt.OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT as usize];
    if directory.VirtualAddress == 0 {
        return 0;
    }
    let mut descriptor =
        base.add(directory.VirtualAddress as usize) as *const IMAGE_IMPORT_DESCRIPTOR;
    let mut patched = 0;
    while (*descriptor).Name != 0 {
        let dll = CStr::from_ptr(base.add((*descriptor).Name as usize) as *const c_char);
        for patch in patches
            .iter()
            .filter(|p| dll.to_bytes().eq_ignore_ascii_case(p.dll.as_bytes()))
        {
            patched |= patch_descriptor(base, &*descriptor, patch);
        }
        descriptor = descriptor.add(1);
    }
    patched
}

/// # Safety
/// `descriptor` must belong to the image at `base`.
unsafe fn patch_descriptor(
    base: *const u8,
    descriptor: &IMAGE_IMPORT_DESCRIPTOR,
    patch: &ImportPatch,
) -> u32 {
    let names = descriptor.Anonymous.OriginalFirstThunk;
    if names == 0 {
        return 0;
    }
    let mut name_thunk = base.add(names as usize) as *const u64;
    let mut slot = base.add(descriptor.FirstThunk as usize) as *mut usize;
    while *name_thunk != 0 {
        if *name_thunk & ORDINAL_FLAG == 0 {
            let name = base.add(*name_thunk as usize + HINT_SIZE) as *const c_char;
            if CStr::from_ptr(name).to_bytes() == patch.function.as_bytes() {
                return if write_slot(slot, patch.replacement) {
                    patch.bit
                } else {
                    0
                };
            }
        }
        name_thunk = name_thunk.add(1);
        slot = slot.add(1);
    }
    0
}

/// # Safety
/// `slot` must be an import address table entry of this process.
unsafe fn write_slot(slot: *mut usize, value: usize) -> bool {
    const SIZE: usize = std::mem::size_of::<usize>();
    let mut previous = 0;
    if VirtualProtect(slot as *const c_void, SIZE, PAGE_READWRITE, &mut previous) == 0 {
        return false;
    }
    slot.write_volatile(value);
    VirtualProtect(slot as *const c_void, SIZE, previous, &mut previous) != 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
    use windows_sys::Win32::System::Threading::GetCurrentProcessId;

    const FAKE_PID: u32 = 4242;

    extern "system" fn fake_pid() -> u32 {
        FAKE_PID
    }

    fn real_pid_function() -> usize {
        let kernel32 = windows_sys::w!("kernel32.dll");
        // SAFETY: looks up an exported function of an already loaded system DLL.
        unsafe {
            let module = GetModuleHandleW(kernel32);
            GetProcAddress(module, c"GetCurrentProcessId".as_ptr().cast()).unwrap() as usize
        }
    }

    fn pid_patch(replacement: usize) -> ImportPatch {
        ImportPatch {
            bit: 0b10,
            dll: "KERNEL32.dll",
            function: "GetCurrentProcessId",
            replacement,
        }
    }

    #[test]
    fn an_import_of_the_main_module_is_replaced_and_can_be_put_back() {
        let mask = patch_main_module(&[pid_patch(fake_pid as *const () as usize)]);
        // SAFETY: a plain query without arguments; the call goes through the patched import slot.
        let patched = unsafe { GetCurrentProcessId() };
        let restored_mask = patch_main_module(&[pid_patch(real_pid_function())]);
        // SAFETY: as above.
        let restored = unsafe { GetCurrentProcessId() };
        assert_eq!((mask, patched), (0b10, FAKE_PID));
        assert_eq!(restored_mask, 0b10);
        assert_eq!(restored, std::process::id());
    }

    #[test]
    fn a_slot_that_cannot_be_unprotected_is_not_written_and_not_reported() {
        // SAFETY: the dangling address is never mapped, so the protection change fails before any write.
        assert!(!unsafe { write_slot(std::ptr::dangling_mut::<usize>(), 5) });
    }

    #[test]
    fn an_import_the_exe_does_not_have_is_not_reported() {
        let unknown_function = ImportPatch {
            function: "NoSuchFunction",
            ..pid_patch(1)
        };
        let unknown_dll = ImportPatch {
            dll: "nosuch.dll",
            ..pid_patch(1)
        };
        assert_eq!(patch_main_module(&[unknown_function, unknown_dll]), 0);
    }
}
