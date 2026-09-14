@echo off
REM ============================================================
REM  MonkeyCode instant sync (TWO-WAY) - double-click launcher
REM  Runs monkeycode-sync.ps1 next to this file.
REM  Windows 10 Pro + PowerShell 5.1, no admin needed.
REM ============================================================
title MonkeyCode Instant Sync (Two-Way)
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monkeycode-sync.ps1"

REM If the sync window closes (error / stopped), keep it open so you can read it.
echo.
echo Sync stopped. Press any key to close.
pause >nul
