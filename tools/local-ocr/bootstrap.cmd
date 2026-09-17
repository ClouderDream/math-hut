@echo off
setlocal
if "%~1"=="" (
  echo 用法: bootstrap.cmd ^<目标目录^>
  echo 示例: bootstrap.cmd D:\codex_work\math-hut
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1" -TargetDir "%~1"
if errorlevel 1 pause
