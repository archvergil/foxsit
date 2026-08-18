[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$nodeVersion = '24.18.1'
$archiveName = "node-v$nodeVersion-win-x64.zip"
$expectedSha256 = 'EC56B84A7551893AB2324EBDFDC4AB974A63B4781162600B68A1293CC3E53765'
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolsRoot = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot '.tools'))
$nodeContainer = [System.IO.Path]::GetFullPath((Join-Path $toolsRoot 'node'))
$nodeRoot = [System.IO.Path]::GetFullPath((Join-Path $nodeContainer "node-v$nodeVersion-win-x64"))
$archivePath = [System.IO.Path]::GetFullPath((Join-Path $toolsRoot $archiveName))

foreach ($target in @($toolsRoot, $nodeContainer, $nodeRoot, $archivePath)) {
  if (-not $target.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to use a path outside the workspace: $target"
  }
}

$nodeExecutable = Join-Path $nodeRoot 'node.exe'
if (Test-Path -LiteralPath $nodeExecutable) {
  Write-Output "Portable Node.js v$nodeVersion is already ready at $nodeRoot"
  & $nodeExecutable --version
  exit 0
}

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
if (-not (Test-Path -LiteralPath $archivePath)) {
  $downloadUrl = "https://nodejs.org/dist/v$nodeVersion/$archiveName"
  Write-Output "Downloading $downloadUrl"
  Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
}

$actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToUpperInvariant()
if ($actualSha256 -ne $expectedSha256) {
  throw "Node.js archive checksum mismatch. Expected $expectedSha256, got $actualSha256"
}

New-Item -ItemType Directory -Force -Path $nodeContainer | Out-Null
Expand-Archive -LiteralPath $archivePath -DestinationPath $nodeContainer -Force

if (-not (Test-Path -LiteralPath $nodeExecutable)) {
  throw "Node.js extraction completed without node.exe at $nodeExecutable"
}

Write-Output "Portable Node.js installed and SHA-256 verified at $nodeRoot"
& $nodeExecutable --version
