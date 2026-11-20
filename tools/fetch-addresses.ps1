# 장소 주소 받기: data/spots.json 의 위치(위도·경도)로 OpenStreetMap Nominatim 에서 거리 주소를 받아 data/addresses.json 에 적어요.
# 장소 창의 "Location" 칸에 지도와 함께 보여줘요. 이미 받은 장소는 건너뛰어요 (새 장소만 받으려면 그냥 다시 실행).
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/fetch-addresses.ps1
# Nominatim 이용 규칙: 1초에 1번 이하, 앱 이름을 User-Agent 로 밝혀요. 데이터는 © OpenStreetMap contributors (ODbL) — 사이트 아래쪽에 이미 출처가 있어요.
param([switch]$Redo)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$enc = New-Object System.Text.UTF8Encoding($false)
$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$out = Join-Path $root 'data/addresses.json'
$have = [ordered]@{}
if ((Test-Path $out) -and -not $Redo) {
  $old = Get-Content $out -Raw -Encoding UTF8 | ConvertFrom-Json
  $old.addresses.PSObject.Properties | ForEach-Object { $have[$_.Name] = $_.Value }
}
function Save {
  $obj = [ordered]@{ updatedAt = (Get-Date).ToString('yyyy-MM-dd'); source = 'OpenStreetMap Nominatim reverse geocoding (c) OpenStreetMap contributors, ODbL'; addresses = $have }
  [IO.File]::WriteAllText($out, ($obj | ConvertTo-Json -Depth 4), $enc)
}
$todo = @($spots | Where-Object { $_.lat -ne $null -and -not $have.Contains($_.id) })
Write-Host "주소 받을 장소 $($todo.Count)곳 (이미 있음 $($have.Count)곳)"
$ua = @{ 'User-Agent' = 'TinyTripsDataBuild/1.0'; 'Accept-Language' = 'en' }
$i = 0
foreach ($s in $todo) {
  $i++
  $url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=$($s.lat)&lon=$($s.lng)"
  try {
    $r = Invoke-RestMethod -Uri $url -Headers $ua -TimeoutSec 20
    $a = $r.address
    $street = (@($a.house_number, $a.road) | Where-Object { $_ }) -join ' '
    $city = @($a.city, $a.town, $a.village, $a.municipality, $a.suburb) | Where-Object { $_ } | Select-Object -First 1
    $line = (@($street, $city) | Where-Object { $_ }) -join ', '
    if ($line) { $have[$s.id] = $line }
  } catch { Write-Host "  실패 $($s.id): $($_.Exception.Message)" }
  if ($i % 50 -eq 0) { Save; Write-Host "  $i / $($todo.Count)" }
  Start-Sleep -Milliseconds 1100
}
Save
Write-Host "끝: 주소 $($have.Count)곳 → data/addresses.json"
