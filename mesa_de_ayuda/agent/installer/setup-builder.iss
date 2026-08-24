; Inno Setup Compiler Script for STIC Agent
[Setup]
AppName=STIC Agent - Mesa de Ayuda
AppVersion=1.0.0
AppPublisher=Alcaldia de Yopal / STIC
DefaultDirName=C:\ProgramData\STIC-Agent
DefaultGroupName=STIC Agent
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=STIC-Agent-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
WizardStyle=modern

[Files]
Source: "..\dist\stic-agent.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\stic-agent.config.json"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "schtasks.exe"; Parameters: "/Create /TN STIC-Agent-Sync /TR ""node C:\ProgramData\STIC-Agent\stic-agent.js sync"" /SC MINUTE /MO 30 /RU SYSTEM /RL HIGHEST /F"; Flags: runhidden

[UninstallRun]
Filename: "schtasks.exe"; Parameters: "/Delete /TN STIC-Agent-Sync /F"; Flags: runhidden
