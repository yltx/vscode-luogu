$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'daily-punch.ps1'
$content = Get-Content -LiteralPath $scriptPath -Raw
$packagePath = Join-Path $PSScriptRoot '..\package.json'
$packageContent = [IO.File]::ReadAllText($packagePath, [Text.Encoding]::UTF8)

$required = @(
  "[ValidateSet('Setup', 'Run', 'InstallTask', 'UninstallTask', 'Status')]",
  'https://www.luogu.com.cn/',
  'index/ajax_punch',
  'Export-Clixml',
  'Import-Clixml',
  'X-CSRF-Token',
  'Register-ScheduledTask',
  'New-ScheduledTaskTrigger -Daily',
  'StartWhenAvailable'
)
foreach ($item in $required) {
  if (-not $content.Contains($item)) { throw "Missing expected implementation: $item" }
}

if ($packageContent -notmatch '"test:daily-punch"\s*:') {
  throw 'package.json is missing test:daily-punch.'
}
if (
  $packageContent -notmatch
  '"ci"\s*:\s*"[^"]*test:daily-punch[^"]*"'
) {
  throw 'The CI script does not run test:daily-punch.'
}

$forbiddenPatterns = @(
  '__client_id\s*=\s*[^''"\s]+',
  '_uid\s*=\s*\d+',
  'csrf-token\s*[:=]\s*\d+:'
)
foreach ($pattern in $forbiddenPatterns) {
  if ($content -match $pattern) { throw "Script appears to contain a hard-coded credential: $pattern" }
}

$tokens = $null
$errors = $null
[Management.Automation.Language.Parser]::ParseFile(
  $scriptPath,
  [ref]$tokens,
  [ref]$errors
) | Out-Null
if ($errors.Count -gt 0) {
  throw ($errors | ForEach-Object Message | Out-String)
}

'daily-punch.ps1 static checks passed.'
