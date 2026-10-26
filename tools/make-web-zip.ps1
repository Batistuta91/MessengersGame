# אורז את המשחק לקובץ ZIP אחד (לאתרים אחרים כמו itch.io / Netlify)
# ל-GitHub Pages אין צורך בזה: התיקייה הזו היא האתר — רק Commit + Push ב-GitHub Desktop
# -NoMusic : בלי שירי הרדיו
param([switch]$NoMusic)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'web'
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'index.html') -Destination $stage
foreach ($d in @('css', 'js', 'lib', 'assets')) { Copy-Item -LiteralPath (Join-Path $root $d) -Destination $stage -Recurse }
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'data') | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'data\city.js') -Destination (Join-Path $stage 'data')
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'music') | Out-Null
# רק שירים מהתיקייה music עצמה — לא מ-music\local
$exts = @('.mp3', '.m4a', '.ogg', '.wav', '.aac', '.webm')
$songs = @()
if (-not $NoMusic) {
  $songs = @(Get-ChildItem -LiteralPath (Join-Path $root 'music') -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name)
  foreach ($s in $songs) { Copy-Item -LiteralPath $s.FullName -Destination (Join-Path $stage 'music') }
}
$items = $songs | ForEach-Object { '  "' + ($_.Name -replace '\\', '\\\\' -replace '"', '\"') + '"' }
[IO.File]::WriteAllText((Join-Path $stage 'music\playlist.js'), "window.RADIO_SONGS = [`n" + ($items -join ",`n") + "`n];`n", (New-Object Text.UTF8Encoding $false))
Write-Host "שירים בחבילה: $($songs.Count)"
$zip = Join-Path $dist ($(if ($NoMusic) { 'shluchim-web-nomusic.zip' } else { 'shluchim-web.zip' }))
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
# ZIP עם נתיבים תקניים (/) ושמות בעברית ב-UTF-8 — שרתי אינטרנט קוראים אותו נכון
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fs = [IO.File]::Open($zip, [IO.FileMode]::CreateNew)
$archive = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create, $false, [Text.Encoding]::UTF8)
$base = (Resolve-Path $stage).Path.TrimEnd('\') + '\'
foreach ($file in Get-ChildItem -LiteralPath $stage -Recurse -File) {
  $rel = $file.FullName.Substring($base.Length).Replace('\', '/')
  [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $rel, [IO.Compression.CompressionLevel]::Optimal)
}
$archive.Dispose()
$fs.Dispose()
Write-Host "נוצר: $zip ($([Math]::Round((Get-Item $zip).Length / 1MB, 1)) MB)"
