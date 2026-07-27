[CmdletBinding()]
param(
  [ValidateSet('Setup', 'Run', 'InstallTask', 'UninstallTask', 'Status')]
  [string]$Mode = 'Run',
  [ValidatePattern('^([01]\d|2[0-3]):[0-5]\d$')]
  [string]$At = '08:00',
  [string]$TaskName = 'vscode-luogu-daily-punch',
  [string]$StateDirectory = (Join-Path $env:LOCALAPPDATA 'vscode-luogu\daily-punch')
)

$ErrorActionPreference = 'Stop'
$baseUri = [Uri]'https://www.luogu.com.cn/'
$punchUri = [Uri]::new($baseUri, 'index/ajax_punch')
$credentialPath = Join-Path $StateDirectory 'credential.xml'
$logPath = Join-Path $StateDirectory 'daily-punch.log'

function Write-Log([string]$Message) {
  $line = '{0:yyyy-MM-dd HH:mm:ss} {1}' -f (Get-Date), $Message
  $line
  if (Test-Path -LiteralPath $StateDirectory) {
    Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
  }
}

function Ensure-StateDirectory {
  if (-not (Test-Path -LiteralPath $StateDirectory)) {
    New-Item -ItemType Directory -Path $StateDirectory | Out-Null
  }
}

function Save-Credential {
  Ensure-StateDirectory
  $uid = (Read-Host 'Luogu UID').Trim()
  if ($uid -notmatch '^\d+$') { throw 'UID must contain digits only.' }

  $clientId = Read-Host 'Luogu __client_id' -AsSecureString
  if ($clientId.Length -eq 0) { throw '__client_id must not be empty.' }

  [pscustomobject]@{
    Version = 1
    Uid = $uid
    ClientId = $clientId
  } | Export-Clixml -LiteralPath $credentialPath

  Write-Log "Credential saved with Windows user-scoped DPAPI: $credentialPath"
}

function Load-Credential {
  if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "Credential is not configured. Run: powershell -File `"$PSCommandPath`" -Mode Setup"
  }

  $credential = Import-Clixml -LiteralPath $credentialPath
  if ($credential.Version -ne 1 -or $credential.Uid -notmatch '^\d+$') {
    throw 'Invalid credential file. Run Setup again.'
  }
  if ($credential.ClientId -isnot [Security.SecureString]) {
    throw 'The current Windows user cannot decrypt the credential. Run Setup again.'
  }
  return $credential
}

function ConvertFrom-SecureStringPlainText([Security.SecureString]$Value) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Get-CsrfToken(
  [Microsoft.PowerShell.Commands.WebRequestSession]$Session
) {
  $response = Invoke-WebRequest -Uri $baseUri -WebSession $Session -Headers @{
    Accept = 'text/html,application/xhtml+xml'
    Referer = $baseUri.AbsoluteUri
  } -TimeoutSec 20 -UseBasicParsing

  $match = [regex]::Match(
    $response.Content,
    '<meta\s+name=["'']csrf-token["'']\s+content=["'']([^"'']+)["'']'
  )
  if (-not $match.Success) {
    throw 'Cannot obtain a CSRF token from Luogu. The login cookie may be expired.'
  }
  return [Net.WebUtility]::HtmlDecode($match.Groups[1].Value).Trim()
}

function Get-ResponseMessage($Response) {
  foreach ($name in @('message', 'errorMessage')) {
    $property = $Response.PSObject.Properties[$name]
    if ($property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
      return [string]$property.Value
    }
  }
  return ''
}

function Invoke-DailyPunch {
  $credential = Load-Credential
  $clientId = ConvertFrom-SecureStringPlainText $credential.ClientId
  try {
    $session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $session.UserAgent = 'vscode-luogu-daily-punch/1.0'
    $session.Cookies.Add(
      [Net.Cookie]::new('_uid', [string]$credential.Uid, '/', '.luogu.com.cn')
    )
    $session.Cookies.Add(
      [Net.Cookie]::new('__client_id', $clientId, '/', '.luogu.com.cn')
    )

    $csrfToken = Get-CsrfToken $session
    $response = Invoke-RestMethod -Uri $punchUri -Method Post -WebSession $session `
      -Headers @{
        Accept = '*/*'
        Origin = $baseUri.GetLeftPart([UriPartial]::Authority)
        Referer = $baseUri.AbsoluteUri
        'X-CSRF-Token' = $csrfToken
        'X-Requested-With' = 'XMLHttpRequest'
      } -ContentType 'application/x-www-form-urlencoded' -Body '' `
      -TimeoutSec 20

    $code = if ($response.PSObject.Properties['code']) {
      [int]$response.code
    } else {
      0
    }
    $message = Get-ResponseMessage $response

    if ($code -in 200, 201) {
      Write-Log $(if ($message) { "Punch succeeded: $message" } else { 'Punch succeeded.' })
      return
    }

    if ($message -match '已经|打过|重复') {
      Write-Log "Already punched today: $message"
      return
    }

    throw "Luogu returned a failed result: code=$code message=$message"
  } finally {
    $clientId = $null
  }
}

function Install-DailyTask {
  if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw 'Run Setup before installing the scheduled task.'
  }
  if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') {
    throw 'InstallTask is supported on Windows only.'
  }

  $powerShell = Join-Path $PSHOME 'powershell.exe'
  if (-not (Test-Path -LiteralPath $powerShell)) {
    $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  }
  $escapedScript = $PSCommandPath.Replace('"', '""')
  $escapedState = $StateDirectory.Replace('"', '""')
  $arguments =
    "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$escapedScript`" -Mode Run -StateDirectory `"$escapedState`""
  $action = New-ScheduledTaskAction -Execute $powerShell -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -Daily -At $At
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Description 'Run the Luogu daily punch automatically' -Force | Out-Null
  Write-Log "Scheduled task installed: $TaskName, daily at $At."
}

function Show-Status {
  Write-Log $(if (Test-Path -LiteralPath $credentialPath) {
      "Credential: configured ($credentialPath)"
    } else {
      'Credential: not configured'
    })

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($task) {
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Log "Scheduled task: $($task.State), lastResult=$($info.LastTaskResult), nextRun=$($info.NextRunTime)"
  } else {
    Write-Log 'Scheduled task: not installed'
  }
}

switch ($Mode) {
  'Setup' { Save-Credential }
  'Run' { Invoke-DailyPunch }
  'InstallTask' { Install-DailyTask }
  'UninstallTask' {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Log "Scheduled task removed: $TaskName"
  }
  'Status' { Show-Status }
}
