// Tauri's internal IPC entry, used by tests to call commands like the UI does.
declare global {
  interface Window {
    __TAURI_INTERNALS__: { invoke: (command: string, args?: unknown) => Promise<unknown> };
  }
}
export {};
