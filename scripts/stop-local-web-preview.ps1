$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".local\web-preview.pid"

if (!(Test-Path $pidFile)) {
  Write-Output "Local web preview is not running."
  exit 0
}

$previewPid = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($previewPid) {
  try {
    Stop-Process -Id ([int]$previewPid) -Force -ErrorAction Stop
    Write-Output "Stopped local web preview (PID $previewPid)."
  } catch {
    Write-Warning "Could not stop process $previewPid. It may have already exited."
  }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
