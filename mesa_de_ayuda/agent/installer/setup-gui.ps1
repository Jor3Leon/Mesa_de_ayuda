# ==============================================================================
# STIC Agent - Professional Multi-Language Windows GUI Installer
# All text is pure ASCII to avoid encoding issues in Windows Forms
# ==============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# --- Translations Dictionary (ASCII only - no accents, no emoji) ---
$I18N = @{
    ES = @{
        WindowTitle       = "Instalador STIC Agent - Mesa de Ayuda"
        HeaderTitle       = "STIC Agent"
        HeaderSubtitle    = "Asistente de Configuracion e Instalacion"
        LangLabel         = "Idioma / Language:"
        ServerLabel       = "URL del Servidor:"
        ServerHint        = "Direccion del servidor (ej. https://mesa.yopal.gov.co)"
        OrgLabel          = "Organizacion (Slug):"
        OrgHint           = "Identificador de la entidad (ej. stic)"
        IntervalLabel     = "Frecuencia de Sincronizacion (minutos):"
        IntervalHint      = "Tiempo entre recolecciones (recomendado: 30 min)"
        InstallBtn        = "Instalar e Iniciar Servicio"
        StatusInstalling  = "Instalando servicio y configurando entorno..."
        SuccessTitle      = "Instalacion Completada"
        SuccessMsg        = "El Agente STIC se ha instalado correctamente en el sistema.`n`nEl servicio de inventario se ejecutara en segundo plano automaticamente."
        ValidationTitle   = "Campos Requeridos"
        ValidationMsg     = "Por favor ingrese la URL del servidor y el slug de la organizacion."
        ErrorTitle        = "Error de Instalacion"
        VersionLabel      = "v1.0.0 - Mesa de Ayuda STIC"
    }
    EN = @{
        WindowTitle       = "STIC Agent Setup - Help Desk"
        HeaderTitle       = "STIC Agent"
        HeaderSubtitle    = "Configuration and Installation Wizard"
        LangLabel         = "Language / Idioma:"
        ServerLabel       = "Server URL:"
        ServerHint        = "Help Desk server address (e.g. https://mesa.yopal.gov.co)"
        OrgLabel          = "Organization Slug:"
        OrgHint           = "Identifier assigned to your organization (e.g. stic)"
        IntervalLabel     = "Sync Interval (minutes):"
        IntervalHint      = "Time between inventory syncs (recommended: 30 min)"
        InstallBtn        = "Install and Start Service"
        StatusInstalling  = "Installing service and setting up environment..."
        SuccessTitle      = "Installation Complete"
        SuccessMsg        = "STIC Agent has been successfully installed on your system.`n`nThe background inventory service will run automatically."
        ValidationTitle   = "Required Fields"
        ValidationMsg     = "Please enter both the server URL and organization slug."
        ErrorTitle        = "Installation Error"
        VersionLabel      = "v1.0.0 - STIC Help Desk"
    }
}

$currentLang = "ES"

# --- Main Form ---
$Form = New-Object System.Windows.Forms.Form
$Form.Text = $I18N[$currentLang].WindowTitle
$Form.Size = New-Object System.Drawing.Size(560, 540)
$Form.StartPosition = "CenterScreen"
$Form.FormBorderStyle = "FixedDialog"
$Form.MaximizeBox = $false
$Form.MinimizeBox = $true
$Form.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)

# --- Top Header Panel (Dark) ---
$HeaderPanel = New-Object System.Windows.Forms.Panel
$HeaderPanel.Size = New-Object System.Drawing.Size(560, 80)
$HeaderPanel.Location = New-Object System.Drawing.Point(0, 0)
$HeaderPanel.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$Form.Controls.Add($HeaderPanel)

$HeaderTitle = New-Object System.Windows.Forms.Label
$HeaderTitle.Text = $I18N[$currentLang].HeaderTitle
$HeaderTitle.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$HeaderTitle.ForeColor = [System.Drawing.Color]::White
$HeaderTitle.Location = New-Object System.Drawing.Point(28, 14)
$HeaderTitle.Size = New-Object System.Drawing.Size(300, 30)
$HeaderPanel.Controls.Add($HeaderTitle)

$HeaderSub = New-Object System.Windows.Forms.Label
$HeaderSub.Text = $I18N[$currentLang].HeaderSubtitle
$HeaderSub.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$HeaderSub.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$HeaderSub.Location = New-Object System.Drawing.Point(28, 46)
$HeaderSub.Size = New-Object System.Drawing.Size(350, 22)
$HeaderPanel.Controls.Add($HeaderSub)

# --- Language Selector (top-right in header) ---
$LblLang = New-Object System.Windows.Forms.Label
$LblLang.Text = $I18N[$currentLang].LangLabel
$LblLang.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$LblLang.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$LblLang.Location = New-Object System.Drawing.Point(395, 14)
$LblLang.Size = New-Object System.Drawing.Size(130, 16)
$HeaderPanel.Controls.Add($LblLang)

$ComboLang = New-Object System.Windows.Forms.ComboBox
$ComboLang.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
$ComboLang.Items.AddRange(@("Espanol", "English"))
$ComboLang.SelectedIndex = 0
$ComboLang.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$ComboLang.Location = New-Object System.Drawing.Point(395, 32)
$ComboLang.Size = New-Object System.Drawing.Size(130, 26)
$HeaderPanel.Controls.Add($ComboLang)

# --- Separator Line ---
$Sep = New-Object System.Windows.Forms.Panel
$Sep.Size = New-Object System.Drawing.Size(560, 2)
$Sep.Location = New-Object System.Drawing.Point(0, 80)
$Sep.BackColor = [System.Drawing.Color]::FromArgb(2, 132, 199)
$Form.Controls.Add($Sep)

# --- Form Fields Area ---
$yPos = 96

# 1. Server URL
$LblServer = New-Object System.Windows.Forms.Label
$LblServer.Text = $I18N[$currentLang].ServerLabel
$LblServer.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5)
$LblServer.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$LblServer.Location = New-Object System.Drawing.Point(28, $yPos)
$LblServer.Size = New-Object System.Drawing.Size(496, 20)
$Form.Controls.Add($LblServer)

$TxtServer = New-Object System.Windows.Forms.TextBox
$TxtServer.Text = "https://mesa-de-ayuda.vercel.app"
$TxtServer.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$TxtServer.Location = New-Object System.Drawing.Point(28, ($yPos + 24))
$TxtServer.Size = New-Object System.Drawing.Size(490, 28)
$Form.Controls.Add($TxtServer)

$HintServer = New-Object System.Windows.Forms.Label
$HintServer.Text = $I18N[$currentLang].ServerHint
$HintServer.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$HintServer.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$HintServer.Location = New-Object System.Drawing.Point(28, ($yPos + 54))
$HintServer.Size = New-Object System.Drawing.Size(496, 16)
$Form.Controls.Add($HintServer)

# 2. Organization Slug
$yPos += 82

$LblOrg = New-Object System.Windows.Forms.Label
$LblOrg.Text = $I18N[$currentLang].OrgLabel
$LblOrg.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5)
$LblOrg.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$LblOrg.Location = New-Object System.Drawing.Point(28, $yPos)
$LblOrg.Size = New-Object System.Drawing.Size(496, 20)
$Form.Controls.Add($LblOrg)

$TxtOrg = New-Object System.Windows.Forms.TextBox
$TxtOrg.Text = "stic"
$TxtOrg.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$TxtOrg.Location = New-Object System.Drawing.Point(28, ($yPos + 24))
$TxtOrg.Size = New-Object System.Drawing.Size(490, 28)
$Form.Controls.Add($TxtOrg)

$HintOrg = New-Object System.Windows.Forms.Label
$HintOrg.Text = $I18N[$currentLang].OrgHint
$HintOrg.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$HintOrg.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$HintOrg.Location = New-Object System.Drawing.Point(28, ($yPos + 54))
$HintOrg.Size = New-Object System.Drawing.Size(496, 16)
$Form.Controls.Add($HintOrg)

# 3. Sync Interval
$yPos += 82

$LblInterval = New-Object System.Windows.Forms.Label
$LblInterval.Text = $I18N[$currentLang].IntervalLabel
$LblInterval.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5)
$LblInterval.ForeColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$LblInterval.Location = New-Object System.Drawing.Point(28, $yPos)
$LblInterval.Size = New-Object System.Drawing.Size(496, 20)
$Form.Controls.Add($LblInterval)

$TxtInterval = New-Object System.Windows.Forms.TextBox
$TxtInterval.Text = "30"
$TxtInterval.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$TxtInterval.Location = New-Object System.Drawing.Point(28, ($yPos + 24))
$TxtInterval.Size = New-Object System.Drawing.Size(490, 28)
$Form.Controls.Add($TxtInterval)

$HintInterval = New-Object System.Windows.Forms.Label
$HintInterval.Text = $I18N[$currentLang].IntervalHint
$HintInterval.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$HintInterval.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$HintInterval.Location = New-Object System.Drawing.Point(28, ($yPos + 54))
$HintInterval.Size = New-Object System.Drawing.Size(496, 16)
$Form.Controls.Add($HintInterval)

# --- Status Label ---
$LblStatus = New-Object System.Windows.Forms.Label
$LblStatus.Text = ""
$LblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Italic)
$LblStatus.ForeColor = [System.Drawing.Color]::FromArgb(2, 132, 199)
$LblStatus.Location = New-Object System.Drawing.Point(28, 370)
$LblStatus.Size = New-Object System.Drawing.Size(496, 20)
$Form.Controls.Add($LblStatus)

# --- Install Button ---
$BtnInstall = New-Object System.Windows.Forms.Button
$BtnInstall.Text = $I18N[$currentLang].InstallBtn
$BtnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$BtnInstall.BackColor = [System.Drawing.Color]::FromArgb(2, 132, 199)
$BtnInstall.ForeColor = [System.Drawing.Color]::White
$BtnInstall.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$BtnInstall.FlatAppearance.BorderSize = 0
$BtnInstall.Location = New-Object System.Drawing.Point(28, 400)
$BtnInstall.Size = New-Object System.Drawing.Size(490, 48)
$BtnInstall.Cursor = [System.Windows.Forms.Cursors]::Hand
$Form.Controls.Add($BtnInstall)

# --- Footer Version ---
$LblVersion = New-Object System.Windows.Forms.Label
$LblVersion.Text = $I18N[$currentLang].VersionLabel
$LblVersion.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$LblVersion.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$LblVersion.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$LblVersion.Location = New-Object System.Drawing.Point(28, 460)
$LblVersion.Size = New-Object System.Drawing.Size(490, 18)
$Form.Controls.Add($LblVersion)

# --- Language Switch Handler ---
function UpdateLanguage {
    $lang = if ($ComboLang.SelectedIndex -eq 1) { "EN" } else { "ES" }
    $script:currentLang = $lang
    $t = $I18N[$lang]

    $Form.Text         = $t.WindowTitle
    $HeaderTitle.Text   = $t.HeaderTitle
    $HeaderSub.Text     = $t.HeaderSubtitle
    $LblLang.Text       = $t.LangLabel
    $LblServer.Text     = $t.ServerLabel
    $HintServer.Text    = $t.ServerHint
    $LblOrg.Text        = $t.OrgLabel
    $HintOrg.Text       = $t.OrgHint
    $LblInterval.Text   = $t.IntervalLabel
    $HintInterval.Text  = $t.IntervalHint
    $BtnInstall.Text    = $t.InstallBtn
    $LblVersion.Text    = $t.VersionLabel
}

$ComboLang.Add_SelectedIndexChanged({ UpdateLanguage })

# --- Base Paths Captured at Startup ---
$SCRIPT_DIR = Split-Path -Parent $PSCommandPath
if (-not $SCRIPT_DIR) { $SCRIPT_DIR = $PSScriptRoot }
if (-not $SCRIPT_DIR) { $SCRIPT_DIR = (Get-Location).Path }

$AGENT_DIR = Split-Path -Parent $SCRIPT_DIR
$BUNDLE_SRC = Join-Path $AGENT_DIR "dist\stic-agent.js"

# --- Install Click Handler ---
$BtnInstall.Add_Click({
    $t = $I18N[$script:currentLang]
    $server   = $TxtServer.Text.Trim()
    $org      = $TxtOrg.Text.Trim()
    $interval = $TxtInterval.Text.Trim()

    if ([string]::IsNullOrWhiteSpace($server) -or [string]::IsNullOrWhiteSpace($org)) {
        [System.Windows.Forms.MessageBox]::Show(
            $t.ValidationMsg,
            $t.ValidationTitle,
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
        return
    }

    $BtnInstall.Enabled = $false
    $LblStatus.Text = $t.StatusInstalling
    $Form.Refresh()

    try {
        # 1. Create install directory
        $installDir = "C:\ProgramData\STIC-Agent"
        if (-not (Test-Path $installDir)) {
            New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        }

        # 2. Copy agent bundle
        if (Test-Path $BUNDLE_SRC) {
            Copy-Item -Path $BUNDLE_SRC -Destination "$installDir\stic-agent.js" -Force
        } elseif (Test-Path "$AGENT_DIR\src\index.js") {
            Copy-Item -Path "$AGENT_DIR\src" -Destination "$installDir\src" -Recurse -Force
            Copy-Item -Path "$AGENT_DIR\package.json" -Destination "$installDir\package.json" -Force
        }

        # 3. Write config.json
        $configText = @"
{
  "serverUrl": "$server",
  "organizationSlug": "$org",
  "syncIntervalMinutes": $interval,
  "apiKey": "",
  "proxy": "",
  "logLevel": "info"
}
"@
        [System.IO.File]::WriteAllText("$installDir\config.json", $configText, [System.Text.Encoding]::UTF8)

        # 4. Register Windows Scheduled Task
        $taskName = "STIC-Agent-Sync"
        $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
        if (-not $nodePath) { $nodePath = "node" }

        schtasks /Delete /TN $taskName /F 2>$null
        schtasks /Create /TN $taskName /TR "`"$nodePath`" `"$installDir\stic-agent.js`" sync" /SC MINUTE /MO $interval /RU SYSTEM /RL HIGHEST /F | Out-Null

        # 5. Trigger first sync in background
        Start-Process -FilePath $nodePath -ArgumentList "`"$installDir\stic-agent.js`" sync" -WindowStyle Hidden

        [System.Windows.Forms.MessageBox]::Show(
            $t.SuccessMsg,
            $t.SuccessTitle,
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
        $Form.Close()
    }
    catch {
        [System.Windows.Forms.MessageBox]::Show(
            $_.Exception.Message,
            $t.ErrorTitle,
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
        $BtnInstall.Enabled = $true
        $LblStatus.Text = ""
    }
})

[void]$Form.ShowDialog()
