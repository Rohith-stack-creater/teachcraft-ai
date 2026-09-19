param(
  [switch]$Production
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

if (-not (Test-Path '.env.local')) { throw 'Missing .env.local. Copy .env.example to .env.local and add secrets locally.' }

$envText = Get-Content '.env.local' -Raw
function Get-Value([string]$Name) {
  $match = [regex]::Match($envText, "(?m)^$Name=(.*)$")
  if (-not $match.Success) { return '' }
  return $match.Groups[1].Value.Trim()
}

$mode = Get-Value 'NEXT_PUBLIC_DEMO_MODE'
if ($Production -and $mode -ne 'false') {
  Write-Host 'Production validation requires NEXT_PUBLIC_DEMO_MODE=false.' -ForegroundColor Yellow
  Write-Host 'No secret values were printed.'
  exit 1
}
$required = @('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
if ($Production -or $mode -eq 'false') { $required += 'ANTHROPIC_API_KEY' }
$missing = @()
foreach ($name in $required) {
  if ([string]::IsNullOrWhiteSpace((Get-Value $name))) { $missing += $name }
}

if ($missing.Count -gt 0) {
  Write-Host ('Missing configuration: ' + ($missing -join ', ')) -ForegroundColor Yellow
  Write-Host 'No secret values were printed.'
  exit 1
}

if ($mode -eq 'true' -and -not $Production) {
  Write-Host 'Demo configuration is valid. Live Claude is intentionally disabled.' -ForegroundColor Green
} else {
  Write-Host 'Production configuration variables are present.' -ForegroundColor Green
}
Write-Host 'Secret values were not displayed.'
