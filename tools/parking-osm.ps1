# 스팟 근처 주차장 찾기 (OpenStreetMap, Overpass API). 결과는 data/parking.json
# - 스팟 좌표 400m 안의 amenity=parking 중 가까운 순 최대 2곳: 거리(m), 유료 여부(fee), 요금(charge), 운영사(operator), 웹사이트, 형태, 이름
# - access=private/no 인 곳은 빼고, access=customers(손님 전용)는 표시해요
# - OSM(ODbL) 데이터라 저장해도 되고, 앱에 "© OpenStreetMap contributors"를 표시해요
# 실행: powershell -File tools/parking-osm.ps1 [-Ids a,b]   (새 스팟만 추가할 때는 -Ids, 기존 결과와 합쳐요)
param([string[]]$Ids, [int]$Radius = 400, [int]$Batch = 40)
if ($Ids) { $Ids = @($Ids | ForEach-Object { $_ -split ',' } | Where-Object { $_ }) }

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$UA = 'SpotMate/0.1 (https://github.com/jsp6forcode/spotmate)'
$spots = @((Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots)
if ($Ids) { $spots = @($spots | Where-Object { $_.id -in $Ids }) }
$outPath = Join-Path $root 'data/parking.json'
$result = [ordered]@{}
if ($Ids -and (Test-Path $outPath)) {
  $old = Get-Content $outPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($p in $old.spots.PSObject.Properties) { $result[$p.Name] = $p.Value }
}
function Dist($a1, $o1, $a2, $o2) {
  $r = 6371000; $d1 = ($a2 - $a1) * [math]::PI / 180; $d2 = ($o2 - $o1) * [math]::PI / 180
  $x = [math]::Sin($d1 / 2) * [math]::Sin($d1 / 2) + [math]::Cos($a1 * [math]::PI / 180) * [math]::Cos($a2 * [math]::PI / 180) * [math]::Sin($d2 / 2) * [math]::Sin($d2 / 2)
  [math]::Round($r * 2 * [math]::Atan2([math]::Sqrt($x), [math]::Sqrt(1 - $x)))
}
$inv = [Globalization.CultureInfo]::InvariantCulture
for ($i = 0; $i -lt $spots.Count; $i += $Batch) {
  $chunk = $spots[$i..([math]::Min($i + $Batch, $spots.Count) - 1)]
  $q = "[out:json][timeout:90];(" + (($chunk | ForEach-Object { "nwr(around:$Radius,$($_.lat.ToString($inv)),$($_.lng.ToString($inv)))[amenity=parking];" }) -join '') + ");out tags center;"
  $res = $null
  for ($try = 1; $try -le 4 -and -not $res; $try++) {
    try { $res = Invoke-RestMethod -Method Post -Uri 'https://overpass-api.de/api/interpreter' -UserAgent $UA -Body @{ data = $q } -TimeoutSec 120 }
    catch { Write-Warning "batch $i try $try : $($_.Exception.Message)"; Start-Sleep -Seconds (20 * $try) }
  }
  if (-not $res) { throw "Overpass 실패 (batch $i). 기존 data/parking.json은 그대로 둬요." }
  $lots = @($res.elements | ForEach-Object {
    $lat = if ($_.lat) { $_.lat } else { $_.center.lat }; $lon = if ($_.lon) { $_.lon } else { $_.center.lon }
    $t = $_.tags
    if ($t.access -in 'private', 'no') { return }
    [pscustomobject]@{ lat = $lat; lon = $lon; fee = $t.fee; kind = $t.parking; name = $t.name; access = $t.access; operator = $t.operator; charge = $t.charge; site = $(if ($t.website) { $t.website } else { $t.'contact:website' }) }
  })
  foreach ($s in $chunk) {
    $near = @($lots | ForEach-Object { $_ | Add-Member m (Dist $s.lat $s.lng $_.lat $_.lon) -Force -PassThru } | Where-Object { $_.m -le $Radius } | Sort-Object m | Select-Object -First 2)
    $result[$s.id] = @($near | ForEach-Object {
      $o = [ordered]@{ m = [int]$_.m }
      if ($_.fee -in 'yes', 'no') { $o.fee = $_.fee }
      if ($_.kind -in 'surface', 'multi-storey', 'underground', 'street_side', 'lane', 'layby', 'rooftop') { $o.kind = $_.kind }
      if ($_.name) { $o.name = [string]$_.name }
      if ($_.access -eq 'customers') { $o.customers = $true }
      if ($_.operator) { $o.operator = [string]$_.operator }
      if ($_.charge) { $o.charge = [string]$_.charge }
      if ($_.site -match '^https?://') { $o.site = [string]$_.site }
      $o
    })
  }
  Write-Host "$([math]::Min($i + $Batch, $spots.Count)) / $($spots.Count)"
  Start-Sleep -Seconds 5
}
$out = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
  source = "OpenStreetMap contributors (ODbL), parking lots (amenity=parking) within $Radius m of each place"
  radius = $Radius
  spots = $result
}
[IO.File]::WriteAllText($outPath, ($out | ConvertTo-Json -Depth 5 -Compress) + "`n", (New-Object Text.UTF8Encoding $false))
$with = @($result.Values | Where-Object { @($_).Count }).Count
Write-Host "끝: 주차장이 400m 안에 있는 스팟 $with / $($result.Count)"
