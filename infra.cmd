@echo off
cd /d D:\HR_IN_Solution
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\infra.ps1"
pause
