$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host 'TeachCraft AI - clean installation and build' -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
  throw 'Node.js and npm are required. Install Node.js 20 or newer, reopen PowerShell, and run this script again.'
}

$nodeVersion = (& node --version).TrimStart('v')
$major = [int]($nodeVersion.Split('.')[0])
if ($major -lt 20) { throw "Node.js 20 or newer is required. Found $nodeVersion." }
Write-Host "Using Node.js $nodeVersion"

if (Test-Path 'node_modules') {
  Write-Host 'Removing incomplete node_modules...' -ForegroundColor Yellow
  Remove-Item 'node_modules' -Recurse -Force
}

if (Test-Path '.next') {
  Write-Host 'Removing previous Next.js build output...' -ForegroundColor Yellow
  Remove-Item '.next' -Recurse -Force
}

if (-not (Test-Path '.env.local') -and (Test-Path '.env.example')) {
  Copy-Item '.env.example' '.env.local'
  Write-Host 'Created .env.local from .env.example. Add keys before testing real generation.' -ForegroundColor Yellow
}

Write-Host 'Installing dependencies...' -ForegroundColor Cyan
& npm install --prefer-online --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE." }

Write-Host 'Running the production build...' -ForegroundColor Cyan
& npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE." }

Write-Host ''
Write-Host 'TeachCraft AI build passed.' -ForegroundColor Green
Write-Host 'Start locally with: npm run dev'
Write-Host 'Open: http://localhost:3000'
