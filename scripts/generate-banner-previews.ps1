$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$gifDirectory = Join-Path $repositoryRoot 'public\gifs'
$previewDirectory = Join-Path $gifDirectory 'previews'
New-Item -ItemType Directory -Path $previewDirectory -Force | Out-Null

$assets = Get-ChildItem -LiteralPath $gifDirectory -File | Where-Object {
  $_.BaseName -match '^(habits|workout)_\d+$' -and $_.Extension -eq '.gif'
}

foreach ($asset in $assets) {
  $source = [System.Drawing.Image]::FromFile($asset.FullName)
  try {
    $preview = New-Object System.Drawing.Bitmap 320, 180
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($preview)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($source, 0, 0, 320, 180)
        $target = Join-Path $previewDirectory ($asset.BaseName + '.jpg')
        $preview.Save($target, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      } finally {
        $graphics.Dispose()
      }
    } finally {
      $preview.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

Write-Output "Generated $($assets.Count) banner previews in $previewDirectory"
