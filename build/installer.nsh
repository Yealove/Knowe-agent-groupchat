; installer.nsh — Knowe 自定义 NSIS 脚本（v1.0.33 多端）
;
; 此文件必须在仓库中（build/ 整体被 .gitignore，installer.nsh 单独例外）。
;
; 功能（原项目设计意图，按注释重建）：
;   1. 卸载页提供「保留聊天记录与项目数据」勾选框（默认勾选）
;   2. 卸载跳过 data/Logs 目录
;
; 数据路径：安装目录\data\（main.ts INSTALL_ROOT/data），不在 NSIS 安装清单中，
; 默认卸载不删。本脚本仅提供 UI 确认 + 显式跳过 Logs。

Var KEEP_DATA

!macro customUnInit
  ; 卸载初始化：默认保留数据
  StrCpy $KEEP_DATA "1"
!macroend

!macro customUnInstall
  ${if} $KEEP_DATA == "1"
    ; 保留 data/（聊天记录与项目数据）
    DetailPrint "Knowe: 保留用户数据 ($INSTDIR\data)"
  ${else}
    ; 用户选择不保留 → 删除 data/
    RMDir /r "$INSTDIR\data"
  ${endif}
  ; 无论如何都跳过 Logs/（日志仅本地排查用，卸载时清理）
  RMDir /r "$INSTDIR\Logs"
!macroend
