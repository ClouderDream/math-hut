$ErrorActionPreference = "Continue"

function Get-ListeningProcessIds {
  $ids = @()

  try {
    $connections = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8765 -State Listen -ErrorAction Stop
    if ($connections) {
      $ids += @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    }
  } catch {
    Write-Host "Get-NetTCPConnection 不可用或权限不足，回退到 netstat..." -ForegroundColor Yellow
  }

  if ($ids.Count -eq 0) {
    try {
      $lines = netstat -ano -p TCP 2>$null
      foreach ($line in $lines) {
        if ($line -match '^\s*TCP\s+127\.0\.0\.1:8765\s+\S+\s+LISTENING\s+(\d+)\s*$') {
          $ids += [int]$Matches[1]
        }
      }
    } catch {}
  }

  return @($ids | Where-Object { $_ -gt 0 } | Select-Object -Unique)
}

$processIds = Get-ListeningProcessIds
if (!$processIds -or $processIds.Count -eq 0) {
  Write-Host "8765 端口没有运行中的 OCR 服务。" -ForegroundColor Yellow
  exit 0
}

foreach ($processId in $processIds) {
  try {
    $proc = Get-Process -Id $processId -ErrorAction Stop
    if ($proc.ProcessName -match '^python(w)?$') {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "已停止 OCR 服务进程 PID=$processId" -ForegroundColor Green
    } else {
      Write-Host "8765 端口由非 Python 进程占用：$($proc.ProcessName) PID=$processId，未自动结束。" -ForegroundColor Red
      exit 1
    }
  } catch {
    Write-Host "无法停止 PID=$processId：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}
