@echo off
chcp 65001 >nul
rem Chay Cai-dat.ps1 ma khong can doi chinh sach thuc thi PowerShell.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cai-dat.ps1" %*
echo.
pause
