; installer.nsh — Knowe 自定义 NSIS 脚本（v1.0.33 多端）
;
; 此文件必须在仓库中（build/ 整体被 .gitignore，installer.nsh 单独例外）。
;
; 功能：卸载时清理 Logs/ 目录（日志仅本地排查用），保留 data/（聊天记录与项目数据）。
; 默认卸载不删 data/（不在 NSIS 安装清单中），本脚本仅显式跳过 Logs。
;
; 注意：electron-builder 默认将 NSIS warning 视为 error，
;       不要声明未引用的变量（会触发 warning 6001）。

!macro customUnInstall
  ; 清理 Logs/ 目录（运行时日志，卸载时清理）
  RMDir /r "$INSTDIR\Logs"
!macroend
