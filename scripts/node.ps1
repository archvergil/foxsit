[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $NodeArgs
)

$nodeRoot = Join-Path $PSScriptRoot '..\.tools\node\node-v24.18.1-win-x64'
$nodeExecutable = Join-Path $nodeRoot 'node.exe'

if (-not (Test-Path -LiteralPath $nodeExecutable)) {
  & (Join-Path $PSScriptRoot 'bootstrap-node.ps1')
}

& $nodeExecutable @NodeArgs
exit $LASTEXITCODE
