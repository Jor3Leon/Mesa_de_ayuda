# Discovery Agent for Mesa de Ayuda
# Este script recopila información del hardware y software y la envía al backend.

param (
    [string]$ApiUrl = "http://localhost:5000/api/assets/sync",
    [string]$AgentVersion = "1.0.0"
)

Write-Host "--- Iniciando Recolección de Inventario ---" -ForegroundColor Cyan

try {
    # 1. Información del Sistema
    $cs = Get-CimInstance Win32_ComputerSystem
    $bios = Get-CimInstance Win32_BIOS
    $os = Get-CimInstance Win32_OperatingSystem
    $cpu = Get-CimInstance Win32_Processor
    $baseboard = Get-CimInstance Win32_BaseBoard

    # 2. Información de Red (IP Activa)
    $network = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1
    $ipAddress = if ($network.IPAddress) { $network.IPAddress[0] } else { "0.0.0.0" }

    # 3. Almacenamiento
    $disks = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } # Local Disks
    $storageInfo = ""
    foreach ($disk in $disks) {
        $sizeGB = [Math]::Round($disk.Size / 1GB, 2)
        $freeGB = [Math]::Round($disk.FreeSpace / 1GB, 2)
        $storageInfo += "$($disk.DeviceID) ($sizeGB GB total, $freeGB GB libre); "
    }

    # 4. RAM
    $totalRamGB = [Math]::Round($cs.TotalPhysicalMemory / 1GB, 2)

    # 5. Construir Payload
    $payload = @{
        hostname       = $env:COMPUTERNAME
        serialNumber   = $bios.SerialNumber
        ipAddress      = $ipAddress
        osType         = "Windows"
        osVersion      = "$($os.Caption) ($($os.Version))"
        brand          = $cs.Manufacturer
        model          = $cs.Model
        deviceType     = $cs.SystemFamily
        cpuModel       = $cpu.Name
        ramSummary     = "$totalRamGB GB"
        storageSummary = $storageInfo.TrimEnd("; ")
        motherboard    = "$($baseboard.Manufacturer) $($baseboard.Product)"
        agentVersion   = $AgentVersion
    }

    $jsonPayload = $payload | ConvertTo-Json

    Write-Host "Enviando datos a: $ApiUrl" -ForegroundColor Yellow
    Write-Host "Payload: $jsonPayload" -ForegroundColor Gray

    # 6. Enviar al Backend
    $response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Body $jsonPayload -ContentType "application/json"

    if ($response.success) {
        Write-Host "Sincronización Exitosa! Asset ID: $($response.assetId)" -ForegroundColor Green
    } else {
        Write-Host "Error en la sincronización: $($response.error)" -ForegroundColor Red
    }

} catch {
    Write-Host "Error Crítico durante la recolección: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "--- Proceso Finalizado ---" -ForegroundColor Cyan
