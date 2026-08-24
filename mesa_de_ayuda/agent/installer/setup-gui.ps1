Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "Instalador STIC Agent - Mesa de Ayuda"
$Form.Size = New-Object System.Drawing.Size(520, 420)
$Form.StartPosition = "CenterScreen"
$Form.FormBorderStyle = "FixedDialog"
$Form.MaximizeBox = $false
$Form.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)

# Title Label
$Title = New-Object System.Windows.Forms.Label
$Title.Text = "🖥️ STIC Agent - Asistente de Instalación"
$Title.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$Title.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$Title.Location = New-Object System.Drawing.Point(25, 20)
$Title.Size = New-Object System.Drawing.Size(460, 35)
$Form.Controls.Add($Title)

# Subtitle
$Sub = New-Object System.Windows.Forms.Label
$Sub.Text = "Configure la conexión con el servidor de Mesa de Ayuda para iniciar la sincronización de inventario."
$Sub.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$Sub.ForeColor = [System.Drawing.Color]::FromArgb(71, 85, 105)
$Sub.Location = New-Object System.Drawing.Point(25, 55)
$Sub.Size = New-Object System.Drawing.Size(460, 35)
$Form.Controls.Add($Sub)

# Server URL
$LblServer = New-Object System.Windows.Forms.Label
$LblServer.Text = "URL del Servidor Mesa de Ayuda:"
$LblServer.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$LblServer.Location = New-Object System.Drawing.Point(25, 100)
$LblServer.Size = New-Object System.Drawing.Size(460, 20)
$Form.Controls.Add($LblServer)

$TxtServer = New-Object System.Windows.Forms.TextBox
$TxtServer.Text = "https://mesa-de-ayuda.vercel.app"
$TxtServer.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$TxtServer.Location = New-Object System.Drawing.Point(25, 122)
$TxtServer.Size = New-Object System.Drawing.Size(450, 28)
$Form.Controls.Add($TxtServer)

# Organization Slug
$LblOrg = New-Object System.Windows.Forms.Label
$LblOrg.Text = "Slug de Organización:"
$LblOrg.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$LblOrg.Location = New-Object System.Drawing.Point(25, 160)
$LblOrg.Size = New-Object System.Drawing.Size(460, 20)
$Form.Controls.Add($LblOrg)

$TxtOrg = New-Object System.Windows.Forms.TextBox
$TxtOrg.Text = "stic"
$TxtOrg.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$TxtOrg.Location = New-Object System.Drawing.Point(25, 182)
$TxtOrg.Size = New-Object System.Drawing.Size(450, 28)
$Form.Controls.Add($TxtOrg)

# Sync Interval
$LblInterval = New-Object System.Windows.Forms.Label
$LblInterval.Text = "Intervalo de Sincronización (minutos):"
$LblInterval.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$LblInterval.Location = New-Object System.Drawing.Point(25, 220)
$LblInterval.Size = New-Object System.Drawing.Size(460, 20)
$Form.Controls.Add($LblInterval)

$TxtInterval = New-Object System.Windows.Forms.TextBox
$TxtInterval.Text = "30"
$TxtInterval.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$TxtInterval.Location = New-Object System.Drawing.Point(25, 242)
$TxtInterval.Size = New-Object System.Drawing.Size(450, 28)
$Form.Controls.Add($TxtInterval)

# Status Label
$LblStatus = New-Object System.Windows.Forms.Label
$LblStatus.Text = ""
$LblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Italic)
$LblStatus.ForeColor = [System.Drawing.Color]::FromArgb(2, 132, 199)
$LblStatus.Location = New-Object System.Drawing.Point(25, 280)
$LblStatus.Size = New-Object System.Drawing.Size(450, 25)
$Form.Controls.Add($LblStatus)

# Install Button
$BtnInstall = New-Object System.Windows.Forms.Button
$BtnInstall.Text = "⚡ Instalar e Iniciar Servicio"
$BtnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$BtnInstall.BackColor = [System.Drawing.Color]::FromArgb(2, 132, 199)
$BtnInstall.ForeColor = [System.Drawing.Color]::White
$BtnInstall.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$BtnInstall.FlatAppearance.BorderSize = 0
$BtnInstall.Location = New-Object System.Drawing.Point(25, 315)
$BtnInstall.Size = New-Object System.Drawing.Size(450, 42)
$BtnInstall.Cursor = [System.Windows.Forms.Cursors]::Hand
$Form.Controls.Add($BtnInstall)

$BtnInstall.Add_Click({
    $server = $TxtServer.Text.Trim()
    $org = $TxtOrg.Text.Trim()
    $interval = $TxtInterval.Text.Trim()

    if ([string]::IsNullOrWhiteSpace($server) -or [string]::IsNullOrWhiteSpace($org)) {
        [System.Windows.Forms.MessageBox]::Show("Por favor complete la URL del servidor y el Slug de la organización.", "Campos requeridos", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        return
    }

    $BtnInstall.Enabled = $false
    $LblStatus.Text = "Instalando agente y creando tarea programada..."
    $Form.Refresh()

    try {
        $installDir = "C:\ProgramData\STIC-Agent"
        if (-not (Test-Path $installDir)) {
            New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        }

        # Copy agent bundle
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        $bundleSrc = Join-Path $scriptDir "..\dist\stic-agent.js"
        if (Test-Path $bundleSrc) {
            Copy-Item -Path $bundleSrc -Destination "$installDir\stic-agent.js" -Force
        }

        # Write config JSON
        $configObj = @{
            serverUrl = $server
            organizationSlug = $org
            syncIntervalMinutes = [int]$interval
            apiKey = ""
            proxy = ""
            logLevel = "info"
        }
        $configJson = $configObj | ConvertTo-Json
        Set-Content -Path "$installDir\config.json" -Value $configJson -Encoding UTF8

        # Create Windows Scheduled Task
        $taskName = "STIC-Agent-Sync"
        $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
        if (-not $nodePath) { $nodePath = "node" }

        schtasks /Delete /TN $taskName /F 2>$null
        schtasks /Create /TN $taskName /TR "`"$nodePath`" `"$installDir\stic-agent.js`" sync" /SC MINUTE /MO $interval /RU SYSTEM /RL HIGHEST /F | Out-Null

        # Run first sync in background
        Start-Process -FilePath $nodePath -ArgumentList "`"$installDir\stic-agent.js`", `"sync`"" -WindowStyle Hidden

        [System.Windows.Forms.MessageBox]::Show("✅ ¡El Agente STIC ha sido instalado correctamente!`n`nEl servicio se ejecutará en segundo plano cada $interval minutos.`n`nUbicación: $installDir", "Instalación Completada", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        $Form.Close()
    }
    catch {
        [System.Windows.Forms.MessageBox]::Show("Error durante la instalación:`n`n" + $_.Exception.Message, "Error de Instalación", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $BtnInstall.Enabled = $true
        $LblStatus.Text = ""
    }
})

[void]$Form.ShowDialog()
