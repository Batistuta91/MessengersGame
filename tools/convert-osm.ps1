# ממיר את נתוני OpenStreetMap של הוד השרון לקובץ JS קומפקטי בקואורדינטות מקומיות (מטרים)
# הרצה: powershell -ExecutionPolicy Bypass -File tools\convert-osm.ps1
param(
  [string]$In = "$PSScriptRoot\..\data\hod-hasharon-osm.json",
  [string]$Out = "$PSScriptRoot\..\data\city.js"
)
$ErrorActionPreference = 'Stop'
$lat0 = 32.155; $lon0 = 34.890
$kx = [Math]::Cos($lat0 * [Math]::PI / 180) * 111320.0
$kz = 110540.0
$inv = [Globalization.CultureInfo]::InvariantCulture
function P($pt) {
  $x = [Math]::Round(($pt.lon - $lon0) * $kx, 1)
  $z = [Math]::Round(-($pt.lat - $lat0) * $kz, 1)
  return $x.ToString($inv) + ',' + $z.ToString($inv)
}
function Pts($geom, [bool]$closed) {
  $n = $geom.Count
  if ($closed -and $n -gt 1 -and $geom[0].lat -eq $geom[$n - 1].lat -and $geom[0].lon -eq $geom[$n - 1].lon) { $n-- }
  $a = @(); for ($i = 0; $i -lt $n; $i++) { $a += (P $geom[$i]) }
  return '[' + ($a -join ',') + ']'
}
function Q([string]$s) { if (-not $s) { return 'null' }; return '"' + ($s -replace '\\', '\\\\' -replace '"', '\"') + '"' }

$j = [IO.File]::ReadAllText($In, [Text.Encoding]::UTF8) | ConvertFrom-Json
$B = New-Object System.Collections.Generic.List[string]
$R = New-Object System.Collections.Generic.List[string]
$A = New-Object System.Collections.Generic.List[string]
$POI = New-Object System.Collections.Generic.List[string]
$TR = New-Object System.Collections.Generic.List[string]
foreach ($e in $j.elements) {
  $t = $e.tags
  if ($e.type -eq 'way' -and $e.geometry) {
    if ($t.building) {
      $lv = 'null'
      if ($t.'building:levels') { $lv = [string]([int][double]::Parse(($t.'building:levels' -split '[;,]')[0], $inv)) }
      $h = 'null'
      if ($t.height) { try { $h = ([double]::Parse(($t.height -replace '[^0-9.]', ''), $inv)).ToString($inv) } catch {} }
      $B.Add('{p:' + (Pts $e.geometry $true) + ',l:' + $lv + ',h:' + $h + ',k:' + (Q $t.building) + ',n:' + (Q $t.name) + ',a:' + (Q $t.amenity) + '}')
    } elseif ($t.highway) {
      $closed = ($t.area -eq 'yes')
      $R.Add('{p:' + (Pts $e.geometry $false) + ',t:' + (Q $t.highway) + ',n:' + (Q $t.name) + ',ne:' + (Q $t.'name:en') + ',o:' + ($(if ($t.oneway -eq 'yes') { 1 } else { 0 })) + ',ln:' + ($(if ($t.lanes) { [int]($t.lanes -split ';')[0] } else { 'null' })) + '}')
    } else {
      $kind = $null
      if ($t.leisure -in @('park', 'garden', 'playground', 'pitch', 'dog_park')) { $kind = $t.leisure }
      elseif ($t.landuse -in @('grass', 'recreation_ground', 'village_green', 'meadow', 'orchard', 'forest')) { $kind = $t.landuse }
      elseif ($t.natural -in @('wood', 'scrub', 'grassland')) { $kind = $t.natural }
      elseif ($t.amenity -eq 'parking') { $kind = 'parking' }
      elseif ($t.amenity) { $kind = 'amenity' }
      elseif ($t.landuse) { $kind = 'landuse_' + $t.landuse }
      if ($kind) { $A.Add('{p:' + (Pts $e.geometry $true) + ',k:' + (Q $kind) + ',n:' + (Q $t.name) + ',a:' + (Q $t.amenity) + '}') }
    }
  } elseif ($e.type -eq 'node') {
    if ($t.natural -eq 'tree') { $TR.Add('[' + (P $e) + ']') }
    else {
      $k = if ($t.shop) { 'shop:' + $t.shop } else { 'amenity:' + $t.amenity }
      $xy = (P $e) -split ','
      $POI.Add('{x:' + $xy[0] + ',z:' + $xy[1] + ',k:' + (Q $k) + ',n:' + (Q $t.name) + ',r:' + (Q $t.religion) + '}')
    }
  }
}
$js = "// נוצר אוטומטית מ-OpenStreetMap (© OpenStreetMap contributors, ODbL) — מרכז הוד השרון`n" +
  "// קואורדינטות במטרים: x מזרחה, z דרומה; מרכז: $lat0, $lon0`n" +
  "window.CITY_DATA = {`nbuildings: [" + ($B -join ",`n") + "],`nroads: [" + ($R -join ",`n") + "],`nareas: [" + ($A -join ",`n") + "],`npois: [" + ($POI -join ",`n") + "],`ntrees: [" + ($TR -join ',') + "]`n};`n"
[IO.File]::WriteAllText($Out, $js, (New-Object Text.UTF8Encoding $false))
"buildings $($B.Count), roads $($R.Count), areas $($A.Count), pois $($POI.Count), trees $($TR.Count) -> $([Math]::Round((Get-Item $Out).Length / 1KB)) KB"
