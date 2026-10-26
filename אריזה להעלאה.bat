@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\make-web-zip.ps1"
echo.
echo The ZIP is in the dist folder (for itch.io / Netlify). For GitHub just Commit + Push.
pause
