# 번지 없는 주소 고치기: data/addresses.json 에서 번지(숫자)로 시작하지 않는 주소(공원·트레일 등)를
# 가장 가까운 "차가 다니는 길" 이름으로 바꿔요 → "Near W 6th Avenue, Vancouver".
# Nominatim은 공원 가운데 점에서 가장 가까운 아무 이름(보행 다리, 트레일, 그린웨이)을 줘서 주소로 어색했어요 (사용자, 2026-11-19).
# Nominatim 역지오코딩을 "큰 길" 단계(zoom=16)로 다시 물어서 가장 가까운 차도 이름을 받아요. 차도가 아니면 도시 이름만.
# 이미 "Near ..." 이거나 번지로 시작하는 주소는 건너뛰어요 (다시 실행해도 안전).
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/fix-near-roads.ps1
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12   # Windows PowerShell 5.1 기본값은 옛 TLS라 Overpass가 거절해요
$root = Split-Path -Parent $PSScriptRoot
$enc = New-Object System.Text.UTF8Encoding($false)
$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$byId = @{}; $spots | ForEach-Object { $byId[$_.id] = $_ }
$path = Join-Path $root 'data/addresses.json'
$doc = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
$have = [ordered]@{}; $doc.addresses.PSObject.Properties | ForEach-Object { $have[$_.Name] = $_.Value }
function Save {
  $obj = [ordered]@{ updatedAt = (Get-Date).ToString('yyyy-MM-dd'); source = 'OpenStreetMap Nominatim reverse geocoding; parks use the nearest street (zoom 16) (c) OpenStreetMap contributors, ODbL'; addresses = $have }
  [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 4), $enc)
}
# (Overpass는 이 컴퓨터에서 접속이 안 돼서) Nominatim 역지오코딩 zoom=16 = "큰 길만"으로 가장 가까운 도로를 받아요. 차가 다니는 도로 종류일 때만 써요
$CAR = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link'
function Nearest($lat, $lng, $r) {
  $res = Invoke-RestMethod -Uri "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=16&layer=address&lat=$lat&lon=$lng" -Headers @{ 'User-Agent' = 'TinyTripsDataBuild/1.0'; 'Accept-Language' = 'en' } -TimeoutSec 30
  if ($res.category -eq 'highway' -and $res.type -match "^($CAR)$" -and $res.address.road) { return $res.address.road }
  $null
}
$todo = @($have.Keys | Where-Object { $v = [string]$have[$_]; $v -notmatch '^\d' -and $v -notmatch '^Near ' -and $byId.ContainsKey($_) })
Write-Host "고칠 주소 $($todo.Count)곳"
$i = 0; $fixed = 0
foreach ($id in $todo) {
  $i++; $s = $byId[$id]; $v = [string]$have[$id]
  $city = ($v -split ',\s*')[-1]
  try {
    $road = Nearest $s.lat $s.lng 0
    $have[$id] = if ($road) { "Near $road, $city" } else { $city }
    $fixed++
  } catch { Write-Host "  실패 ${id}: $($_.Exception.Message)"; Start-Sleep -Seconds 10 }
  if ($i % 25 -eq 0) { Save; Write-Host "  $i / $($todo.Count)" }
  Start-Sleep -Milliseconds 1100   # Nominatim: 1초에 1번 이하
}
Save
Write-Host "끝: $fixed 곳 고침 → data/addresses.json"
