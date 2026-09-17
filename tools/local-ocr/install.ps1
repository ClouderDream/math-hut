param(
  [switch]$Force,
  [string]$Python = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "=== Math Hut Local OCR Installer ===" -ForegroundColor Cyan

function Resolve-Python {
  param([string]$Requested)
  if ($Requested) { return $Requested }
  foreach ($candidate in @("py -3.11", "py -3.10", "python")) {
    try {
      $parts = $candidate -split ' '
      $exe = $parts[0]
      $args = @()
      if ($parts.Count -gt 1) { $args = $parts[1..($parts.Count-1)] }
      & $exe @args -c "import sys; assert sys.version_info >= (3,10) and sys.version_info < (3,12); print(sys.executable)" 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) { return $candidate }
    } catch {}
  }
  throw "未找到 Python 3.10/3.11。请先安装 Python 3.11 x64，并勾选 Add Python to PATH。"
}

$PythonCmd = Resolve-Python $Python
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"

if ($Force -and (Test-Path ".venv")) {
  Write-Host "删除旧虚拟环境..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force ".venv"
}

if (!(Test-Path $VenvPython)) {
  Write-Host "创建虚拟环境..."
  $parts = $PythonCmd -split ' '
  & $parts[0] @($parts[1..($parts.Count-1)]) -m venv .venv
}

Write-Host "升级 pip..."
& $VenvPython -m pip install --upgrade pip setuptools wheel

Write-Host "安装 OCR 依赖（首次可能需要较长时间）..."
& $VenvPython -m pip install -r requirements.txt

Write-Host "检查 Python 源码..."
& $VenvPython -m py_compile server.py

Write-Host "安装完成。" -ForegroundColor Green
Write-Host "下一步：运行 .\start.ps1" -ForegroundColor Cyan
