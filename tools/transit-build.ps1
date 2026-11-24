# 장소마다 가까운 버스 정류장(노선 번호)과 SkyTrain·SeaBus·WCE 역을 data/transit.json 으로 만들어요 (사용자 요청, 2026-11-23)
# 데이터: TransLink GTFS Static (https://gtfs-static.translink.ca/gtfs/google_transit.zip, 매주 새로 올라와요)
#   약관: 무료로 쓰고 다시 배포할 수 있지만, 아래 legend 문장을 눈에 띄게 보여줘야 해요 (사이트는 장소 창 지도 밑에 보여줘요)
#   TransLink 이름·로고를 브랜드처럼 쓰면 안 돼요
# 사용법: zip을 받아 풀고(저장소 밖 임시 폴더) 그 폴더를 -Gtfs 로 넘겨요
#   powershell -ExecutionPolicy Bypass -File tools\transit-build.ps1 -Gtfs <풀어 둔 폴더>
# 애보츠포드·칠리왁은 BC Transit 지역이라 이 데이터엔 없어요 (가까운 정류장이 없으면 빈 칸)
param([Parameter(Mandatory)][string]$Gtfs, [int]$BusM = 500, [int]$RailM = 1500)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
# UTF-8로 읽어야 stops.txt 맨 앞 BOM 때문에 첫 칸(stop_id)이 비지 않아요
function Csv($name) { Import-Csv (Join-Path $Gtfs "$name.txt") -Encoding UTF8 }

# 노선: route_id → 번호(앞의 0 빼기)·종류. HandyDART(715)는 빼요
$routes = @{}
foreach ($r in Csv 'routes') {
  if ($r.route_type -eq '715') { continue }
  $short = ($r.route_short_name -replace '^0+(?=\d)', '').Trim()
  $routes[$r.route_id] = [pscustomobject]@{ short = $short; long = $r.route_long_name; type = $r.route_type }
}
$tripRoute = @{}
foreach ($t in Csv 'trips') { if ($routes.ContainsKey($t.route_id)) { $tripRoute[$t.trip_id] = $t.route_id } }
"노선 $($routes.Count), 운행 $($tripRoute.Count)"

# 정류장마다 지나가는 노선 (stop_times 가 커서 한 줄씩 읽어요)
$stopRoutes = New-Object 'System.Collections.Generic.Dictionary[string,System.Collections.Generic.HashSet[string]]'
$sr = New-Object IO.StreamReader (Join-Path $Gtfs 'stop_times.txt')
$head = $sr.ReadLine().Split(','); $iT = [array]::IndexOf($head, 'trip_id'); $iS = [array]::IndexOf($head, 'stop_id')
$lastTrip = ''; $lastRoute = $null
while (($line = $sr.ReadLine()) -ne $null) {
  $p = $line.Split(',')
  $trip = $p[$iT]
  if ($trip -ne $lastTrip) { $lastTrip = $trip; $lastRoute = $tripRoute[$trip] }
  if (-not $lastRoute) { continue }
  $sid = $p[$iS]; $set = $null
  if (-not $stopRoutes.TryGetValue($sid, [ref]$set)) { $set = New-Object 'System.Collections.Generic.HashSet[string]'; $stopRoutes[$sid] = $set }
  [void]$set.Add($lastRoute)
}
$sr.Close()
"노선이 지나는 정류장 $($stopRoutes.Count)"

# 정류장 위치. 전철 승강장은 역(parent_station) 이름으로 묶어요
$all = Csv 'stops'; $byId = @{}; foreach ($s in $all) { $byId[$s.stop_id] = $s }
$bus = New-Object System.Collections.ArrayList; $rail = @{}
foreach ($s in $all) {
  $set = $null; if (-not $stopRoutes.TryGetValue($s.stop_id, [ref]$set)) { continue }
  $types = @($set | ForEach-Object { $routes[$_].type } | Sort-Object -Unique)
  $lat = [double]$s.stop_lat; $lng = [double]$s.stop_lon
  if ($types -contains '3') {
    $nums = @($set | Where-Object { $routes[$_].type -eq '3' } | ForEach-Object { $routes[$_].short } | Where-Object { $_ } | Sort-Object -Unique)
    [void]$bus.Add([pscustomobject]@{ name = $s.stop_name; lat = $lat; lng = $lng; routes = $nums })
  }
  foreach ($ty in '1', '2', '4') {
    if ($types -notcontains $ty) { continue }
    $st = if ($s.parent_station -and $byId[$s.parent_station]) { $byId[$s.parent_station] } else { $s }
    $name = ($st.stop_name -replace '\s*@.*$', '' -replace '\s+(Platform|Bay)\s*\d+.*$', '').Trim()
    $lines = @($set | Where-Object { $routes[$_].type -eq $ty } | ForEach-Object { if ($routes[$_].long) { $routes[$_].long } else { $routes[$_].short } })
    if (-not $rail.ContainsKey($name)) { $rail[$name] = [pscustomobject]@{ name = $name; lat = [double]$st.stop_lat; lng = [double]$st.stop_lon; lines = New-Object 'System.Collections.Generic.HashSet[string]' } }
    foreach ($l in $lines) { [void]$rail[$name].lines.Add($l) }
  }
}
"버스 정류장 $($bus.Count), 역 $($rail.Count)"

# 빠르게 찾으려고 약 1 km 격자로 나눠요
function Cell($lat, $lng) { "{0},{1}" -f [math]::Floor($lat * 90), [math]::Floor($lng * 60) }
$grid = @{}
foreach ($b in $bus) { $k = Cell $b.lat $b.lng; if (-not $grid[$k]) { $grid[$k] = New-Object System.Collections.ArrayList }; [void]$grid[$k].Add($b) }
function Meters($a1, $o1, $a2, $o2) { $r = [math]::PI / 180; $x = ($o2 - $o1) * $r * [math]::Cos(($a1 + $a2) / 2 * $r); $y = ($a2 - $a1) * $r; 6371000 * [math]::Sqrt($x * $x + $y * $y) }
# 번호 순서: 숫자 노선(2, 22, 99) 다음 R4 같은 글자 노선
function SortRoutes($list) { @($list | Sort-Object @{ e = { if ($_ -match '^\d+$') { [int]$_ } else { 100000 } } }, @{ e = { $_ } }) }

$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$out = [ordered]@{}
$railList = @($rail.Values)
foreach ($s in $spots) {
  if ($null -eq $s.lat) { continue }
  $lat = [double]$s.lat; $lng = [double]$s.lng
  $cand = New-Object System.Collections.ArrayList
  $ca = [math]::Floor($lat * 90); $co = [math]::Floor($lng * 60)
  foreach ($da in -1..1) { foreach ($do in -1..1) { $g = $grid["{0},{1}" -f ($ca + $da), ($co + $do)]; if ($g) { foreach ($b in $g) { $d = Meters $lat $lng $b.lat $b.lng; if ($d -le $BusM) { [void]$cand.Add([pscustomobject]@{ b = $b; d = $d }) } } } } }
  # 가까운 순으로, 새 노선이 있는 정류장만 최대 3곳 (같은 노선 반대 방향 정류장은 빼요)
  $seen = New-Object 'System.Collections.Generic.HashSet[string]'; $pick = @()
  foreach ($c in ($cand | Sort-Object d)) {
    $new = @($c.b.routes | Where-Object { -not $seen.Contains($_) })
    if (-not $new.Count) { continue }
    foreach ($r in $c.b.routes) { [void]$seen.Add($r) }
    $pick += [ordered]@{ n = $c.b.name; d = [int][math]::Round($c.d); r = @(SortRoutes $c.b.routes) }
    if ($pick.Count -ge 3) { break }
  }
  $best = $null; $bd = [double]::MaxValue
  foreach ($st in $railList) { $d = Meters $lat $lng $st.lat $st.lng; if ($d -lt $bd) { $bd = $d; $best = $st } }
  $entry = [ordered]@{}
  if ($pick.Count) { $entry.bus = $pick }
  if ($best -and $bd -le $RailM) { $entry.rail = [ordered]@{ n = $best.name; d = [int][math]::Round($bd); l = @($best.lines | Sort-Object) } }
  if ($entry.Count) { $out[$s.id] = $entry }
}

$feed = Csv 'feed_info' | Select-Object -First 1
$doc = [ordered]@{
  source = 'TransLink GTFS Static'; feedVersion = $feed.feed_version; feedEnd = $feed.feed_end_date; builtAt = (Get-Date -Format 'yyyy-MM-dd')
  legend = 'Route and arrival data used in this product or service is provided by permission of TransLink. TransLink assumes no responsibility for the accuracy or currency of the Data used in this product or service.'
  note = 'Walking distance is straight-line metres from the place. Built by tools/transit-build.ps1; rebuild when TransLink posts a new GTFS file (weekly, service changes about 4 times a year).'
  spots = $out
}
$json = $doc | ConvertTo-Json -Depth 6 -Compress
[IO.File]::WriteAllText((Join-Path $root 'data/transit.json'), $json, (New-Object Text.UTF8Encoding $false))
"장소 $($out.Count) / $($spots.Count) 곳에 대중교통 정보, data/transit.json $([math]::Round($json.Length / 1024)) KB"
