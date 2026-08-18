@echo off
set "PROJECT_NODE=%~dp0..\.tools\node\node-v24.18.1-win-x64\node.exe"
if not exist "%PROJECT_NODE%" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap-node.ps1"
"%PROJECT_NODE%" %*
