param(
  [switch]$Force,
  [string]$Python = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "=== Math Hut Local OCR Installer ===" -ForegroundColor Cyan

function Split-Command {
  param([string]$Command)
  $parts = @($Command -split ' ' | Where-Object { $_ -ne '' })
  if ($parts.Count -lt 1) { throw "空的 Python 启动命令" }
  $exe = $parts[0]
  $args = @()
  if ($parts.Count -gt 1) { $args = @($parts[1..($parts.Count - 1)]) }
  return @{ Exe = $exe; Args = $args }
}

function Test-PythonCommand {
  param([string]$Command)
  try {
    $cmd = Split-Command $Command
    & $cmd.Exe @($cmd.Args) -c "import sys; assert sys.version_info >= (3,10) and sys.version_info < (3,12); print(sys.version.split()[0])" 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
  } catch { return $false }
}

function Resolve-Python {
  param([string]$Requested)
  if ($Requested) {
    if (!(Test-PythonCommand $Requested)) { throw "指定的 Python 不可用或版本不是 3.10/3.11：$Requested" }
    return $Requested
  }
  foreach ($candidate in @("py -3.11", "py -3.10", "python")) {
    if (Test-PythonCommand $candidate) { return $candidate }
  }
  throw "未找到 Python 3.10/3.11。请先安装 Python 3.11 x64，并勾选 Add Python to PATH。"
}

$PythonCmd = Resolve-Python $Python
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"

Write-Host "使用 Python 启动器：$PythonCmd"

if ($Force -and (Test-Path ".venv")) {
  Write-Host "删除旧虚拟环境..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force ".venv"
}

if (!(Test-Path $VenvPython)) {
  Write-Host "创建虚拟环境..."
  $cmd = Split-Command $PythonCmd
  & $cmd.Exe @($cmd.Args) -m venv .venv
  if ($LASTEXITCODE -ne 0) { throw "创建虚拟环境失败" }
}

Write-Host "升级 pip..."
& $VenvPython -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) { throw "升级 pip 失败" }

Write-Host "安装 OCR 依赖（首次可能需要较长时间）..."
Write-Host "说明：CPU OCR 当前固定 PaddlePaddle 3.2.2，以规避 3.3.x oneDNN/PIR 已知回归。" -ForegroundColor Yellow
& $VenvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "安装 requirements.txt 失败" }

Write-Host "检查 PaddlePaddle 兼容版本..."
$paddleVersion = (& $VenvPython -c "import paddle; print(paddle.__version__)" 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw "PaddlePaddle 导入失败：$paddleVersion" }
if ($paddleVersion -ne "3.2.2") {
  throw "PaddlePaddle 版本不兼容：当前 $paddleVersion，项目要求 3.2.2。请重新运行 install.ps1 -Force。"
}
Write-Host "PaddlePaddle：$paddleVersion" -ForegroundColor Green

Write-Host "检查 Python 源码..."
& $VenvPython -m py_compile server.py
if ($LASTEXITCODE -ne 0) { throw "server.py 语法检查失败" }

Write-Host "检查关键模块..."
& $VenvPython -c "import fastapi, uvicorn, cv2, PIL, paddleocr, paddle; print('dependencies ok')"
if ($LASTEXITCODE -ne 0) { throw "关键模块导入失败" }

Write-Host "安装完成。" -ForegroundColor Green
Write-Host "下一步：运行 .\start.ps1 或双击 start.cmd" -ForegroundColor Cyan
