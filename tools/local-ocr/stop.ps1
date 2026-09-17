$ErrorActionPreference = "SilentlyContinue"
$connections = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8765 -State Listen
if (!$connections) {
  Write-Host "8765 端口没有运行中的 OCR 服务。" -ForegroundColor Yellow
  exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $pids) {
  try {
    $proc = Get-Process -Id $pid
    if ($proc.ProcessName -match 'python|pythonw') {
      Stop-Process -Id $pid -Force
      Write-Host "已停止 OCR 服务进程 PID=$pid" -ForegroundColor Green
    } else {
      Write-Host "8765 端口由非 Python 进程占用：$($proc.ProcessName) PID=$pid，未自动结束。" -ForegroundColor Red
      exit 1
    }
  } catch {
    Write-Host "无法停止 PID=$pid：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}
