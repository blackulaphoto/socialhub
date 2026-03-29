$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root ".local\postgres-data"
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"

if (!(Test-Path $dataDir)) {
  Write-Error "Postgres data directory not found at $dataDir"
  exit 1
}

& $pgCtl -D $dataDir stop
