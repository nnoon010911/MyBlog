@echo off
setlocal
cd /d "%~dp0"
"C:\Program Files\PowerShell\7\pwsh.exe" -ExecutionPolicy Bypass -File "%~dp0publish-blog.ps1"
endlocal
