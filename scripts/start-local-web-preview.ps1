$root = Split-Path -Parent $PSScriptRoot
$port = 4173
$previewUrl = "http://localhost:$port"
$healthUrl = "$previewUrl/index.html"
$pidFile = Join-Path $root ".local\web-preview.pid"
$stdoutLog = Join-Path $root ".local\web-preview.stdout.log"
$stderrLog = Join-Path $root ".local\web-preview.stderr.log"
$apiOrigin = "http://localhost:3001"

function Test-WebPreviewHealthy {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (Test-WebPreviewHealthy -Url $healthUrl) {
  Write-Output "Local web preview is already running at $previewUrl"
  exit 0
}

& (Join-Path $PSScriptRoot "start-local-api.ps1")
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to start local API"
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
  $env:VITE_API_BASE_URL = $previewUrl
  & pnpm --filter @workspace/social-app run build
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend production build failed"
    exit 1
  }

  $env:LOCAL_WEB_PREVIEW_PORT = "$port"
  $env:LOCAL_WEB_PREVIEW_API_ORIGIN = $apiOrigin

  $process = Start-Process `
    -FilePath "node" `
    -ArgumentList ".\scripts\src\local-web-preview-server.mjs" `
    -WorkingDirectory $root `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

  Set-Content -Path $pidFile -Value $process.Id

  $started = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    if ($process.HasExited) {
      break
    }
    if (Test-WebPreviewHealthy -Url $healthUrl) {
      $started = $true
      break
    }
  }

  if (-not $started) {
    if (-not $process.HasExited) {
      $started = $true
    } else {
      Write-Error "Web preview failed to become healthy at $previewUrl"
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
  }

  Write-Output "Local web preview started successfully."
  Write-Output "Preview: $previewUrl"
  Write-Output "Proxy target: $apiOrigin"
  Write-Output "PID: $($process.Id)"
  Write-Output "Logs: $stdoutLog / $stderrLog"
} finally {
  Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:LOCAL_WEB_PREVIEW_PORT -ErrorAction SilentlyContinue
  Remove-Item Env:LOCAL_WEB_PREVIEW_API_ORIGIN -ErrorAction SilentlyContinue
  Pop-Location
}
