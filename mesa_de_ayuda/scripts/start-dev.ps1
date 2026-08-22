$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'
$statePath = Join-Path $repoRoot '.dev-processes.json'
$backendLog = Join-Path $repoRoot 'backend-open.log'
$backendErrLog = Join-Path $repoRoot 'backend-open.err.log'
$frontendLog = Join-Path $repoRoot 'frontend-open.log'
$frontendErrLog = Join-Path $repoRoot 'frontend-open.err.log'
$nodePath = (Get-Command node).Source

function Stop-PortProcess {
  param([int]$Port)

  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    $connections |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
      }
  } catch {
    # No listener on that port.
  }
}

if (Test-Path $statePath) {
  try {
    $existing = Get-Content $statePath | ConvertFrom-Json
    @($existing.backendPid, $existing.frontendPid) |
      Where-Object { $_ } |
      ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
      }
  } catch {
    # Ignore malformed state file and continue with port cleanup.
  }
}

Stop-PortProcess -Port 5000
Stop-PortProcess -Port 5173

Remove-Item $backendLog, $backendErrLog, $frontendLog, $frontendErrLog -Force -ErrorAction SilentlyContinue

$backendProcess = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @(
    'server.js'
  ) `
  -WorkingDirectory $backendDir `
  -RedirectStandardOutput $backendLog `
  -RedirectStandardError $backendErrLog `
  -WindowStyle Hidden `
  -PassThru

$frontendProcess = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @(
    '.\node_modules\vite\bin\vite.js',
    '--configLoader', 'native',
    '--host', '127.0.0.1',
    '--port', '5173'
  ) `
  -WorkingDirectory $frontendDir `
  -RedirectStandardOutput $frontendLog `
  -RedirectStandardError $frontendErrLog `
  -WindowStyle Hidden `
  -PassThru

@{
  backendPid = $backendProcess.Id
  frontendPid = $frontendProcess.Id
  startedAt = (Get-Date).ToString('o')
} | ConvertTo-Json | Set-Content $statePath

Start-Sleep -Seconds 5

$backendOk = $false
$frontendOk = $false

try {
  $backendResponse = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5000/api/health' -TimeoutSec 5
  $backendOk = $backendResponse.StatusCode -eq 200
} catch {}

try {
  $frontendResponse = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5173' -TimeoutSec 5
  $frontendOk = $frontendResponse.StatusCode -eq 200
} catch {}

if (-not $backendOk -or -not $frontendOk) {
  Write-Host 'No se pudo iniciar completamente el entorno de desarrollo.' -ForegroundColor Red
  Write-Host "Backend activo: $backendOk | Frontend activo: $frontendOk" -ForegroundColor Yellow
  Write-Host "Revisa los logs: $backendErrLog y $frontendErrLog" -ForegroundColor Yellow
  exit 1
}

Write-Host 'Entorno iniciado correctamente.' -ForegroundColor Green
Write-Host 'Frontend: http://127.0.0.1:5173' -ForegroundColor Cyan
Write-Host 'Backend:  http://127.0.0.1:5000/api/health' -ForegroundColor Cyan
