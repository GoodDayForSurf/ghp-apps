@echo off
rem Launcher: runs start-server.ps1 (it asks for administrator rights itself).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" %*
