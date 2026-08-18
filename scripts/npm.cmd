@echo off
set "PROJECT_NODE_ROOT=%~dp0..\.tools\node\node-v24.18.1-win-x64"
if not exist "%PROJECT_NODE_ROOT%\npm.cmd" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap-node.ps1"
set "PATH=%PROJECT_NODE_ROOT%;%PATH%"
call "%PROJECT_NODE_ROOT%\npm.cmd" %*
