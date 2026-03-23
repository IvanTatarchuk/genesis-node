# Full deploy: Vercel (app) + Railway (darwin, trinity, orchestrator)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "=== 1. Vercel (production) ===" -ForegroundColor Cyan
Set-Location $root
npx vercel --prod --yes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. Railway: Darwin ===" -ForegroundColor Cyan
Set-Location $root\darwin
railway up --detach
if ($LASTEXITCODE -ne 0) { Write-Host "Darwin: railway up failed (run 'railway link' in darwin/ if needed)" -ForegroundColor Yellow }

Write-Host "`n=== 3. Railway: Trinity ===" -ForegroundColor Cyan
Set-Location $root\trinity
npm run build 2>$null
railway up --detach
if ($LASTEXITCODE -ne 0) { Write-Host "Trinity: railway up failed" -ForegroundColor Yellow }

Write-Host "`n=== 4. Railway: Orchestrator ===" -ForegroundColor Cyan
Set-Location $root\orchestrator
railway up --detach
if ($LASTEXITCODE -ne 0) { Write-Host "Orchestrator: railway up failed" -ForegroundColor Yellow }

Set-Location $root
Write-Host "`n=== Deploy finished ===" -ForegroundColor Green
