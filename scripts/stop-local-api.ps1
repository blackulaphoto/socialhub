$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".local\api-server.pid"
$port = 3001

$stopped = $false

if (Test-Path $pidFile) {
  $pidValue = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($pidValue) {
    try {
      Stop-Process -Id ([int]$pidValue) -Force -ErrorAction Stop
      $stopped = $true
    } catch {
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$portPids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($portPid in $portPids) {
  try {
    Stop-Process -Id $portPid -Force -ErrorAction Stop
    $stopped = $true
  } catch {
  }
}

if ($stopped) {
  Write-Output "Local API stopped."
} else {
  Write-Output "No local API process was running."
}
