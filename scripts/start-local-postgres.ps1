$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root ".local\postgres-data"
$logFile = Join-Path $root ".local\postgres.log"
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"

if (!(Test-Path $dataDir)) {
  Write-Error "Postgres data directory not found at $dataDir"
  exit 1
}

$statusOutput = & $pgCtl -D $dataDir status 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Output "Repo-local PostgreSQL is already running."
  exit 0
}

if (!(Test-Path $logFile)) {
  New-Item -ItemType File -Path $logFile -Force | Out-Null
}

& $pgCtl -D $dataDir -l $logFile start
