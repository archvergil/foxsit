[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $NpmArgs
)

$nodeRoot = Join-Path $PSScriptRoot '..\.tools\node\node-v24.18.1-win-x64'
$npmExecutable = Join-Path $nodeRoot 'npm.cmd'

if (-not (Test-Path -LiteralPath $npmExecutable)) {
  & (Join-Path $PSScriptRoot 'bootstrap-node.ps1')
}

$env:PATH = "$nodeRoot;$env:PATH"
& $npmExecutable @NpmArgs
exit $LASTEXITCODE
