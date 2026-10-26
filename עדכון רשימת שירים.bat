@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\update-playlist.ps1"
echo.
echo Done. Refresh the game (F5).
pause
