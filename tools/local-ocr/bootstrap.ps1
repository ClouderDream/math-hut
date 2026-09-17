param(
  [Parameter(Mandatory=$true)][string]$TargetDir,
  [string]$Repo = "https://github.com/ClouderDream/math-hut.git",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$TargetDir = [System.IO.Path]::GetFullPath($TargetDir)
Write-Host "=== Math Hut Local OCR Bootstrap ===" -ForegroundColor Cyan
Write-Host "目标目录：$TargetDir"

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
  throw "未找到 Git。请先安装 Git for Windows。"
}

if (!(Test-Path $TargetDir)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $TargetDir -Parent) | Out-Null
  git clone $Repo $TargetDir
} elseif (!(Test-Path (Join-Path $TargetDir ".git"))) {
  $items = Get-ChildItem -Force $TargetDir -ErrorAction SilentlyContinue
  if ($items) { throw "目标目录已存在且不是 Git 仓库，请换一个空目录或现有 math-hut 仓库目录。" }
  git clone $Repo $TargetDir
} else {
  Write-Host "检测到现有仓库，拉取 main 最新版本..."
  Push-Location $TargetDir
  try {
    if (git status --porcelain) {
      Write-Host "存在未提交改动，跳过自动 pull。" -ForegroundColor Yellow
    } else {
      git fetch origin main
      git pull --ff-only origin main
    }
  } finally { Pop-Location }
}

$OcrDir = Join-Path $TargetDir "tools\local-ocr"
if (!(Test-Path (Join-Path $OcrDir "install.ps1"))) {
  throw "未找到 tools\local-ocr\install.ps1，请确认仓库版本。"
}

if (!$SkipInstall) {
  & (Join-Path $OcrDir "install.ps1")
}

Write-Host ""
Write-Host "本机配置完成。" -ForegroundColor Green
Write-Host "启动命令：$OcrDir\start.cmd"
Write-Host "诊断命令：$OcrDir\doctor.cmd"
