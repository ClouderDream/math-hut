$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $Root "..\..")
$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"

Write-Host "=== Math Hut Local OCR Doctor ===" -ForegroundColor Cyan
Write-Host "仓库：$RepoRoot"
Write-Host "工具：$Root"

function Show-Check($Name, $Ok, $Detail) {
  if ($Ok) { Write-Host "[OK]   $Name - $Detail" -ForegroundColor Green }
  else { Write-Host "[FAIL] $Name - $Detail" -ForegroundColor Red }
}

$gitOk = $false
try { git --version | Out-Null; $gitOk = $LASTEXITCODE -eq 0 } catch {}
Show-Check "Git" $gitOk ($(if($gitOk){(git --version)}else{"未安装或不在 PATH"}))

$pyOk = Test-Path $VenvPython
Show-Check "虚拟环境" $pyOk ($(if($pyOk){$VenvPython}else{"未创建，请运行 install.ps1"}))

if ($pyOk) {
  try {
    $ver = & $VenvPython --version 2>&1
    Show-Check "Python" ($LASTEXITCODE -eq 0) $ver
  } catch { Show-Check "Python" $false $_.Exception.Message }

  foreach ($module in @("fastapi","uvicorn","cv2","PIL","paddleocr","paddle")) {
    try {
      & $VenvPython -c "import $module" 2>$null
      Show-Check "Python 模块 $module" ($LASTEXITCODE -eq 0) "可导入"
    } catch { Show-Check "Python 模块 $module" $false "导入失败" }
  }

  try {
    & $VenvPython -m py_compile (Join-Path $Root "server.py")
    Show-Check "server.py" ($LASTEXITCODE -eq 0) "语法正常"
  } catch { Show-Check "server.py" $false $_.Exception.Message }
}

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 3
  Show-Check "本地服务" ($health.ok -eq $true) ("{0} @ 127.0.0.1:8765" -f $health.engine)
} catch {
  Show-Check "本地服务" $false "未运行或无法访问"
}

Write-Host ""
Write-Host "若只缺服务，请运行：.\start.ps1" -ForegroundColor Cyan
Write-Host "若依赖损坏，请运行：.\install.ps1 -Force" -ForegroundColor Cyan
