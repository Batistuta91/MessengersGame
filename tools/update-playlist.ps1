# מעדכן את רשימות השירים של ״רדיו קול חב״ד״
# הרצה: לחיצה כפולה על ״עדכון רשימת שירים.bat״ בתיקייה הראשית
#   music\        — שירים שעולים גם לאתר  → music\playlist.js
#   music\local\  — שירים רק למחשב הזה    → music\playlist.local.js (לא עולה ל-GitHub)
$ErrorActionPreference = 'Stop'
$music = Join-Path $PSScriptRoot '..\music'
$local = Join-Path $music 'local'
$exts = @('.mp3', '.m4a', '.ogg', '.wav', '.aac', '.webm')
$pub = @(Get-ChildItem -LiteralPath $music -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name | ForEach-Object { $_.Name })
$loc = @()
if (Test-Path $local) { $loc = @(Get-ChildItem -LiteralPath $local -File | Where-Object { $exts -contains $_.Extension.ToLower() } | Sort-Object Name | ForEach-Object { 'local/' + $_.Name }) }
function ToJs($names) { ($names | ForEach-Object { '  "' + ($_ -replace '\\', '\\\\' -replace '"', '\"') + '"' }) -join ",`n" }
$head = "// נוצר אוטומטית על ידי tools\update-playlist.ps1 — אל תערכו ידנית`n"
[IO.File]::WriteAllText((Join-Path $music 'playlist.js'), $head + "window.RADIO_SONGS = [`n" + (ToJs $pub) + "`n];`n", (New-Object Text.UTF8Encoding $false))
[IO.File]::WriteAllText((Join-Path $music 'playlist.local.js'), $head + "// כולל שירים מקומיים — הקובץ הזה לא עולה לאתר`nwindow.RADIO_SONGS = [`n" + (ToJs ($pub + $loc)) + "`n];`n", (New-Object Text.UTF8Encoding $false))
Write-Host "שירים שעולים לאתר: $($pub.Count)"
$pub | ForEach-Object { Write-Host " - $_" }
Write-Host "שירים רק במחשב הזה (music\local): $($loc.Count)"
$loc | ForEach-Object { Write-Host " - $_" }
