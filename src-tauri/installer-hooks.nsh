; Hooks into Tauri's NSIS template (tauri.conf.json > bundle > windows > nsis > installerHooks).

; The template deletes %APPDATA% and %LOCALAPPDATA% folders named after the identifier;
; floawty's settings and log live in %APPDATA%\floawty, so remove that one too.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    SetShellVarContext current
    RmDir /r "$APPDATA\floawty"
  ${EndIf}
!macroend
