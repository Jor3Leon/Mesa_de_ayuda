$ErrorActionPreference = 'SilentlyContinue'

$repoRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $repoRoot '.dev-processes.json'

function Stop-PortProcess {
  param([int]$Port)

  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen
    $connections |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object {
        Stop-Process -Id $_ -Force
      }
  } catch {}
}

if (Test-Path $statePath) {
  try {
    $state = Get-Content $statePath | ConvertFrom-Json
    @($state.backendPid, $state.frontendPid) |
      Where-Object { $_ } |
      ForEach-Object {
        Stop-Process -Id $_ -Force
      }
  } catch {}

  Remove-Item $statePath -Force
}

Stop-PortProcess -Port 5000
Stop-PortProcess -Port 5173

Write-Host 'Procesos de desarrollo detenidos.' -ForegroundColor Green
