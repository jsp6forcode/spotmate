# 밴쿠버시 주차 미터 요금 (City of Vancouver Open Data "parking-meters"). 결과는 data/parking-meters.json
# - 스팟 좌표 200m 안에서 운영 중인 미터의 요금을 요약해요: 낮(9am–6pm)·저녁(6pm–10pm) 시간당 요금(중앙값과 범위), 시간 제한
# - 밴쿠버시 안의 길거리 미터만 있어요 (다른 도시, 사설 주차장은 없음). 10pm–9am은 무료
# - Open Government Licence – Vancouver: 앱에 출처를 표시해요
# 실행: powershell -File tools/parking-meters.ps1 [-Radius 200]
param([int]$Radius = 200)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$url = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parking-meters/exports/json?select=meter_id,service_status,rate_9am_6pm,rate_6pm_10pm,time_limit_9am_6pm,time_limit_6pm_10pm,credit_card,geo_point_2d'
$raw = Invoke-RestMethod -Uri $url -TimeoutSec 120
# PS 5.1은 JSON 배열을 파이프에 통째로 한 개로 넘겨서 ForEach-Object로 풀어요
$meters = @($raw | ForEach-Object { $_ } | Where-Object { $_.service_status -eq 'In Service' -and $_.geo_point_2d })
if ($meters.Count -lt 1000) { throw "미터가 너무 적어요 ($($meters.Count)개). 기존 파일은 그대로 둬요." }
$spots = @((Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots)
function Money($s) { if ($s -match '\$?\s*(\d+(\.\d+)?)') { [double]$Matches[1] } else { $null } }
function Median($a) { $a = @($a | Sort-Object); if (-not $a.Count) { return $null }; $m = [int][math]::Floor($a.Count / 2); if ($a.Count % 2) { $a[$m] } else { ($a[$m - 1] + $a[$m]) / 2 } }
function Mode($a) { @($a | Where-Object { $_ } | Group-Object | Sort-Object Count -Descending | Select-Object -First 1 | ForEach-Object Name) }
$result = [ordered]@{}
foreach ($s in $spots) {
  $kx = 111320 * [math]::Cos($s.lat * [math]::PI / 180)
  $near = @($meters | Where-Object {
    $dx = ($_.geo_point_2d.lon - $s.lng) * $kx; $dy = ($_.geo_point_2d.lat - $s.lat) * 110574
    [math]::Sqrt($dx * $dx + $dy * $dy) -le $Radius })
  if (-not $near.Count) { continue }
  $day = @($near | ForEach-Object { Money $_.rate_9am_6pm } | Where-Object { $_ -ne $null })
  $eve = @($near | ForEach-Object { Money $_.rate_6pm_10pm } | Where-Object { $_ -ne $null })
  $o = [ordered]@{ n = $near.Count }
  if ($day.Count) { $o.day = Median $day; $o.dayMin = ($day | Measure-Object -Minimum).Minimum; $o.dayMax = ($day | Measure-Object -Maximum).Maximum }
  if ($eve.Count) { $o.eve = Median $eve }
  $lim = Mode ($near | ForEach-Object { $_.time_limit_9am_6pm }); if ($lim) { $o.limit = [string]$lim }
  $o.card = @($near | Where-Object { $_.credit_card -eq 'Yes' }).Count -gt 0
  $result[$s.id] = $o
}
$out = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
  source = 'City of Vancouver Open Data, parking meters. Contains information licensed under the Open Government Licence – Vancouver.'
  licenceUrl = 'https://opendata.vancouver.ca/pages/licence/'
  radius = $Radius
  spots = $result
}
[IO.File]::WriteAllText((Join-Path $root 'data/parking-meters.json'), ($out | ConvertTo-Json -Depth 5 -Compress) + "`n", (New-Object Text.UTF8Encoding $false))
Write-Host "끝: 미터 $($meters.Count)개, 200m 안에 미터가 있는 스팟 $($result.Count) / $($spots.Count)"
