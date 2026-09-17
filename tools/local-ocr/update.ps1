param(
  [switch]$Dependencies
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $Root "..\..")
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"

Set-Location $RepoRoot
if (git status --porcelain) {
  throw "仓库存在未提交改动，为避免覆盖本地修改，本次不自动更新。请先提交、暂存或还原改动。"
}

Write-Host "从 GitHub 更新 main..." -ForegroundColor Cyan
git fetch origin main
git pull --ff-only origin main

Set-Location $Root
if ($Dependencies) {
  if (!(Test-Path $VenvPython)) {
    & (Join-Path $Root "install.ps1")
  } else {
    Write-Host "同步 Python 依赖..."
    & $VenvPython -m pip install -r requirements.txt
  }
}

Write-Host "更新完成。" -ForegroundColor Green
