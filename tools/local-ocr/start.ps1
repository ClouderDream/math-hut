param(
  [switch]$NoUpdate,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $Root "..\..")
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"

if (!(Test-Path $VenvPython)) {
  Write-Host "未检测到本地 OCR 环境，开始安装..." -ForegroundColor Yellow
  & (Join-Path $Root "install.ps1")
}

if (!$NoUpdate) {
  try {
    Set-Location $RepoRoot
    $dirty = git status --porcelain
    if (-not $dirty) {
      Write-Host "检查 GitHub 更新..."
      git fetch origin main | Out-Null
      $local = git rev-parse HEAD
      $remote = git rev-parse origin/main
      if ($local -ne $remote) {
        git pull --ff-only origin main
        Write-Host "代码已更新。" -ForegroundColor Green
      }
    } else {
      Write-Host "检测到本地未提交改动，跳过自动 git pull。" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "自动更新失败，继续使用当前本地版本：$($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Set-Location $Root

Write-Host "检查服务端口 8765..."
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 2
  if ($health.ok) {
    Write-Host "OCR 服务已经运行：$($health.engine)" -ForegroundColor Green
    if (!$NoBrowser) { Start-Process "https://clouderdream.github.io/math-hut/admin/" }
    exit 0
  }
} catch {}

Write-Host "启动 Math Hut Local OCR..." -ForegroundColor Cyan
Write-Host "服务地址：http://127.0.0.1:8765"
Write-Host "按 Ctrl+C 停止。"
if (!$NoBrowser) {
  Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "https://clouderdream.github.io/math-hut/admin/"
  } | Out-Null
}

& $VenvPython server.py
