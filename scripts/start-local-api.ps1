$root = Split-Path -Parent $PSScriptRoot
$port = 3001
$healthUrl = "http://localhost:$port/api/healthz"
$pidFile = Join-Path $root ".local\api-server.pid"
$stdoutLog = Join-Path $root ".local\api-server.stdout.log"
$stderrLog = Join-Path $root ".local\api-server.stderr.log"

function Test-ApiHealthy {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (Test-ApiHealthy -Url $healthUrl) {
  Write-Output "Local API is already running at $healthUrl"
  exit 0
}

& (Join-Path $PSScriptRoot "start-local-postgres.ps1")
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to start local PostgreSQL"
  exit 1
}

if (!(Test-Path (Join-Path $root ".local"))) {
  New-Item -ItemType Directory -Path (Join-Path $root ".local") -Force | Out-Null
}

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($existingPid) {
    try {
      Stop-Process -Id ([int]$existingPid) -Force -ErrorAction Stop
      Start-Sleep -Milliseconds 500
    } catch {
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Remove-Item $stdoutLog, $stderrLog -Force -ErrorAction SilentlyContinue

Push-Location $root
try {
  & pnpm --filter @workspace/db run migrate
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Database migration failed"
    exit 1
  }

  & pnpm --filter @workspace/api-server run build
  if ($LASTEXITCODE -ne 0) {
    Write-Error "API build failed"
    exit 1
  }

  $process = Start-Process `
    -FilePath "node" `
    -ArgumentList "--enable-source-maps", ".\artifacts\api-server\dist\index.mjs" `
    -WorkingDirectory $root `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

  Set-Content -Path $pidFile -Value $process.Id

  $started = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-ApiHealthy -Url $healthUrl) {
      $started = $true
      break
    }
    if ($process.HasExited) {
      break
    }
  }

  if (-not $started) {
    Write-Error "API failed to become healthy at $healthUrl"
    if (Test-Path $stderrLog) {
      Write-Output "stderr:"
      Get-Content $stderrLog -Tail 40
    }
    if (Test-Path $stdoutLog) {
      Write-Output "stdout:"
      Get-Content $stdoutLog -Tail 40
    }
    exit 1
  }

  Write-Output "Local API started successfully."
  Write-Output "Health: $healthUrl"
  Write-Output "PID: $($process.Id)"
  Write-Output "Logs: $stdoutLog / $stderrLog"
} finally {
  Pop-Location
}
