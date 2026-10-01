# 데이터 자동 점검: 검색 추세(trends-weekly.json), 시즌 태그(season.json), Reddit 언급(reddit.json)
# - 오류(구조가 깨짐, 없는 스팟 id, 날짜 계산이 안 맞음)가 있으면 exit 1
# - 경고(데이터가 오래됨, 끝난 시즌 태그)는 출력만. -FailOnStale을 주면 오래된 데이터도 실패로 처리해요
#   (GitHub Actions 주간 점검에서 실패하면 저장소 주인에게 메일이 가서 "수집할 때가 됐다" 알림이 돼요)
# 실행: powershell -File tools/validate-data.ps1 [-MaxAgeDays 7] [-FailOnStale]
param([int]$MaxAgeDays = 7, [switch]$FailOnStale)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$gh = [bool]$env:GITHUB_ACTIONS
$errors = New-Object System.Collections.Generic.List[string]
$warns = New-Object System.Collections.Generic.List[string]
function Err($m) { $errors.Add($m); if ($gh) { Write-Host "::error::$m" } else { Write-Host "ERROR  $m" -ForegroundColor Red } }
function Warn($m) { $warns.Add($m); if ($gh) { Write-Host "::warning::$m" } else { Write-Host "WARN   $m" -ForegroundColor Yellow } }
function Ok($m) { Write-Host "ok     $m" }
function Load($name) {
  $p = Join-Path $root "data/$name"
  if (-not (Test-Path $p)) { return $null }
  try { return (Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { Err "$name 은 JSON이 아니에요: $($_.Exception.Message)"; return $null }
}
# PowerShell 7(Actions)은 JSON의 날짜 문자열을 DateTime으로 바꿀 수 있어서 문자열로 되돌려 비교해요
function S($v) { if ($v -is [datetime]) { $v.ToString('yyyy-MM-dd') } else { [string]$v } }
function D($s) { [datetime]::ParseExact((S $s), 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture) }
function IsDate($s) { (S $s) -match '^\d{4}-\d{2}-\d{2}$' }
function Props($o) { if ($o) { @($o.PSObject.Properties) } else { @() } }
$today = (Get-Date).ToUniversalTime().Date
function CheckAge($name, $updated) {
  if (-not (IsDate $updated)) { Err "$name updatedAt 이 날짜가 아니에요"; return }
  $age = ($today - (D $updated)).Days
  if ($age -gt $MaxAgeDays) { $m = "$name 이 $age 일 전 데이터예요 (기준 $MaxAgeDays 일). 다시 수집해 주세요."; if ($FailOnStale) { Err $m } else { Warn $m } }
  else { Ok "$name 은 $age 일 전 데이터" }
}

$spots = (Load 'spots.json').spots
$ids = @{}; foreach ($s in $spots) { $ids[$s.id] = $s }
Ok "spots.json: $($spots.Count)곳"
# ── 같은 장소가 두 번 들어가지 않게 (2026-09-30 규칙) ──
# 같은 곳으로 보는 기준 (같은 무리끼리만: 아이 장소끼리, 먹거리끼리. 식당 옆 공원은 다른 곳이에요)
#   ① placeId가 같음 ② 80 m 안이고 이름에 같은 특징 단어(4글자 이상, park·centre 같은 흔한 말 제외)가 있음 ③ 1.2 km 안이고 한쪽 이름이 다른 쪽 이름으로 시작함
#   (예: "Whonnock Lake Park" ↔ "Whonnock Lake", "Grouse Mountain Regional Park" ↔ "Grouse Mountain")
# 따로 두기로 정한 곳(별개 명소, 공원 안 놀이터·수영장)은 아래 $sameOk 에 "id|id"로 적어서 통과시켜요
$sameOk = @(
  'giwaterpark|granville', 'stevestonpark|steveston', 'fortlangleynationalhisto|fortlangley', 'fortlangleypark|fortlangley', 'fortlangleykidspark|fortlangley',
  'mundyparktotlot|mundy', 'mundyparkpool|mundy', 'kensingtonparkoutdoorpoo|kensingtonpark', 'confederationparkwaterpa|confederationpark',
  'kitsilanobeachplayground|kits', 'robertburnabyparkplaygro|robertburnabypark', 'stanleyparkplayground|stanley', 'diefenbakerparkplaygroun|diefenbaker',
  # 커뮤니티 센터 안(옆)의 도서관: 따로 운영하는 시설
  'kerrisdalecommunitycentr|vancouverpubliclibraryke2', 'renfrewparkcommunitycent|vancouverpubliclibraryre'
)
$okSet = @{}; foreach ($p in $sameOk) { $a, $b = $p -split '\|'; $okSet["$a|$b"] = 1; $okSet["$b|$a"] = 1 }
function Words($n) { @((NormName $n) -split ' ' | Where-Object { $_.Length -ge 4 -and $_ -notmatch '^(park|parks|centre|center|community|public|library|branch|playground|regional|beach|lake|trail|pool|outdoor|indoor|kids|family|bistro|kitchen|restaurant|grill|diner|cafe|house|west|north|south|east|vancouver|burnaby|richmond|surrey|coquitlam|langley|delta|the)$' }) }
function SpotGroup($s) { if ($s.cat -in 'food', 'dessert') { 'food' } else { 'place' } }
function NormName($n) { (($n -replace '\(.*?\)', '').ToLower() -replace '[^a-z0-9 ]', ' ' -replace '\s+', ' ').Trim() }
function Km($a, $b) { $r = [math]::PI / 180; $x = ([double]$b.lng - [double]$a.lng) * $r * [math]::Cos(([double]$a.lat + [double]$b.lat) / 2 * $r); $y = ([double]$b.lat - [double]$a.lat) * $r; 6371 * [math]::Sqrt($x * $x + $y * $y) }
$grid = @{}; foreach ($s in $spots) { if ($null -eq $s.lat) { continue }; $k = "$([int][math]::Floor([double]$s.lat / 0.02)),$([int][math]::Floor([double]$s.lng / 0.02))"; if (-not $grid[$k]) { $grid[$k] = New-Object System.Collections.ArrayList }; [void]$grid[$k].Add($s) }
$byPlace = @{}; $dupN = 0
foreach ($s in $spots) {
  if ($s.placeId) { if ($byPlace[$s.placeId]) { Err "같은 장소가 두 번 있어요 (placeId 같음): $($byPlace[$s.placeId]) / $($s.id)"; $dupN++ } else { $byPlace[$s.placeId] = $s.id } }
  if ($null -eq $s.lat -or $s.venue) { continue }
  $gy = [int][math]::Floor([double]$s.lat / 0.02); $gx = [int][math]::Floor([double]$s.lng / 0.02); $sn = NormName $s.name
  foreach ($dy in -1..1) { foreach ($dx in -1..1) { foreach ($o in @($grid["$($gy + $dy),$($gx + $dx)"])) {
    if (-not $o -or $o.id -le $s.id -or $o.venue -or $okSet["$($s.id)|$($o.id)"]) { continue }
    if ((SpotGroup $s) -ne (SpotGroup $o)) { continue }
    $d = Km $s $o; if ($d -gt 1.2) { continue }
    $on = NormName $o.name
    $prefix = ($on.Length -ge 6 -and $sn.StartsWith("$on ")) -or ($sn.Length -ge 6 -and $on.StartsWith("$sn ")) -or ($sn -eq $on)
    $shared = @(Words $s.name | Where-Object { (Words $o.name) -contains $_ }).Count -gt 0
    if (($d -lt 0.08 -and $shared) -or $prefix) { Err "같은 장소가 두 번 있는 것 같아요: $($s.id) ($($s.name)) / $($o.id) ($($o.name)), $([math]::Round($d * 1000)) m. 하나를 빼거나, 따로 둘 곳이면 validate-data.ps1 의 `$sameOk 에 적어 주세요."; $dupN++ }
  } } }
}
if (-not $dupN) { Ok '같은 장소 중복 없음' }
foreach ($s in @($spots | Where-Object { $_.hoursUntil })) {
  if (-not (IsDate $s.hoursUntil)) { Err "$($s.id).hoursUntil 은 YYYY-MM-DD 이어야 해요" }
  elseif ((D $s.hoursUntil) -lt $today) { Warn "$($s.id) 의 계절 영업시간이 $(S $s.hoursUntil)에 끝났어요. 새 시즌 시간을 찾아 넣어 주세요." }
}
$noHours = @($spots | Where-Object { -not $_.hours -and -not $_.venue })
if ($noHours.Count) { Ok "영업시간 없는 스팟 $($noHours.Count)곳 (행사 장소 제외)" }
foreach ($s in @($spots | Where-Object { $_.opened })) {
  if ((S $s.opened) -notmatch '^\d{4}-\d{2}$') { Err "$($s.id).opened 는 YYYY-MM 이어야 해요" }
  if ($s.openedSource -notmatch '^https://') { Err "$($s.id).openedSource 는 개업 기사·공식 SNS https 링크여야 해요" }
  if (-not $s.placeId) { Err "$($s.id) 는 새로 연 곳이라 매달 평점을 확인하도록 placeId가 있어야 해요" }
}

# ── 검색 추세 ──
$t = Load 'trends-weekly.json'
if (-not $t) { Err 'trends-weekly.json 이 없어요' } else {
  CheckAge 'trends-weekly.json' $t.updatedAt
  $series = Props $t.series; $daily = Props $t.daily
  if (-not $series.Count) { Err 'series 가 비었어요' }
  $wl = @($series | ForEach-Object { @($_.Value.v).Count } | Sort-Object -Unique)
  if ($wl.Count -ne 1 -or $wl[0] -lt 26) { Err "주간 series 길이가 제각각이거나 너무 짧아요: $($wl -join ',')" } else { Ok "주간 series $($series.Count)곳 × $($wl[0])주" }
  foreach ($x in $series) { if (-not $ids[$x.Name]) { Err "series 에 없는 스팟 id: $($x.Name)" } }
  if (-not (IsDate $t.through) -or (D $t.through).DayOfWeek -ne 'Saturday') { Err "through($($t.through))는 주의 마지막 날(토요일)이어야 해요" }
  if ($daily.Count) {
    $dl = @($daily | ForEach-Object { @($_.Value.v).Count } | Sort-Object -Unique)
    $d0 = @($daily | ForEach-Object { S $_.Value.d0 } | Sort-Object -Unique)
    $pt = @($daily | ForEach-Object { [bool]$_.Value.partial } | Sort-Object -Unique)
    foreach ($x in $daily) { if (-not ($t.series.PSObject.Properties.Name -contains $x.Name)) { Err "daily 에만 있고 series 에 없는 id: $($x.Name)" } }
    if ($dl.Count -ne 1 -or $d0.Count -ne 1 -or $pt.Count -ne 1 -or -not (IsDate $d0[0])) { Err "daily 의 길이/시작일/partial 이 곳마다 달라요 (길이 $($dl -join ','), 시작 $($d0 -join ','))" }
    else {
      $lastFull = (D $d0[0]).AddDays($dl[0] - 1 - [int]$pt[0])
      if ((S $t.recentThrough) -ne $lastFull.ToString('yyyy-MM-dd')) { Err "recentThrough($($t.recentThrough))가 일간 데이터의 마지막 완결일($($lastFull.ToString('yyyy-MM-dd')))과 달라요" }
      elseif ((S $t.recentFrom) -ne $lastFull.AddDays(-2).ToString('yyyy-MM-dd')) { Err "recentFrom($($t.recentFrom))은 recentThrough 이틀 전이어야 해요" }
      else { Ok "일간 daily $($daily.Count)곳, 최근 3일 $($t.recentFrom) ~ $($t.recentThrough)" }
      if ((D $t.through) -gt $lastFull -or (D $t.through) -lt (D $d0[0]).AddDays(6)) { Err "주간 through($($t.through))가 일간 데이터 범위 밖이라 척도를 맞출 수 없어요" }
    }
  } else { Err 'daily(일간 데이터)가 없어요' }
  foreach ($n in (Props $t.notes)) {
    if (-not $ids[$n.Name]) { Err "notes 에 없는 스팟 id: $($n.Name)" }
    if (-not $n.Value.why) { Err "notes.$($n.Name).why 가 비었어요" }
    if ($n.Value.source -and $n.Value.source -notmatch '^https://') { Err "notes.$($n.Name).source 는 https 링크여야 해요" }
  }
  Ok "notes $((Props $t.notes).Count)곳"
}

# ── 시즌 태그 ──
$sn = Load 'season.json'
if ($sn) {
  CheckAge 'season.json' $sn.updatedAt
  $active = 0
  foreach ($g in @($sn.tags)) {
    if (-not ($g.id -and $g.label -and $g.emoji)) { Err "season 태그에 id/label/emoji 가 빠졌어요: $($g.id)"; continue }
    if (-not ((IsDate $g.from) -and (IsDate $g.to)) -or (S $g.from) -gt (S $g.to)) { Err "season.$($g.id) 의 from/to 가 이상해요"; continue }
    if ((D $g.to) -lt $today) { Warn "season.$($g.id) 는 $($g.to)에 끝났어요. 지우거나 새 시즌으로 바꿔 주세요." }
    elseif ((D $g.from) -le $today) { $active++ }
    foreach ($x in (Props $g.spots)) {
      if (-not $ids[$x.Name]) { Err "season.$($g.id) 에 없는 스팟 id: $($x.Name)" }
      if (-not $x.Value.why) { Err "season.$($g.id).$($x.Name).why 가 비었어요" }
      if ($x.Value.start -and -not (IsDate $x.Value.start)) { Err "season.$($g.id).$($x.Name).start 가 날짜(YYYY-MM-DD)가 아니에요" }
      if ($x.Value.source -notmatch '^https://') { Err "season.$($g.id).$($x.Name).source 는 https 링크여야 해요" }
    }
  }
  if (-not $active) { Warn '지금 적용되는 시즌 태그가 없어요' } else { Ok "지금 적용되는 시즌 태그 $active 개" }
}

# ── 행사 ──
$ev = Load 'events.json'
if ($ev) {
  $types = 'market','festival','seasonal','sale','meet','popup'
  $seen = @{}
  foreach ($e in @($ev.events)) {
    if ($seen[$e.id]) { Err "events 에 id가 두 번 있어요: $($e.id)" }; $seen[$e.id] = 1
    if ($types -notcontains $e.type) { Err "events.$($e.id) 의 type($($e.type))을 앱이 몰라요" }
    $sc = $e.schedule
    if (-not ((IsDate $sc.from) -and (IsDate $sc.to)) -or (S $sc.from) -gt (S $sc.to)) { Err "events.$($e.id) 의 from/to 가 이상해요"; continue }
    if ($e.source -notmatch '^https://') { Err "events.$($e.id).source 는 https 링크여야 해요" }
    if ($e.spotId -and -not $ids[$e.spotId]) { Err "events.$($e.id) 의 spotId($($e.spotId))가 spots.json 에 없어요" }
    if ((D $sc.to) -lt $today -and @('sale','meet','popup') -contains $e.type) { Warn "events.$($e.id) 는 $(S $sc.to)에 끝났어요. 지워 주세요." }
  }
  Ok "events $(@($ev.events).Count)개"
}

# ── 주차 (OpenStreetMap) ──
$pk = Load 'parking.json'
if ($pk) {
  $n = 0
  foreach ($x in (Props $pk.spots)) { $n++; if (-not $ids[$x.Name]) { Err "parking 에 없는 스팟 id: $($x.Name)" } }
  $missing = @($spots | Where-Object { -not ($pk.spots.PSObject.Properties.Name -contains $_.id) } | ForEach-Object { $_.id })
  if ($missing.Count) { Warn "주차 정보가 없는 스팟 $($missing.Count)곳: $($missing[0..4] -join ', '). tools/parking-osm.ps1 -Ids 로 채워 주세요." }
  Ok "parking $($n)곳"
}

# ── 해피아워 (happy-hours.json) · 런치 스페셜 (lunch-specials.json) ──
# 자주 안 바뀌어서 45일 기준, 경고만 (주간 점검 실패로 만들지 않아요)
function CheckDeals($file) {
  $dd = Load $file
  if (-not $dd) { return }
  if (-not (IsDate $dd.updatedAt)) { Err "$file updatedAt 이 날짜가 아니에요" }
  elseif (($today - (D $dd.updatedAt)).Days -gt 45) { Warn "$file 이 $(($today - (D $dd.updatedAt)).Days) 일 전 데이터예요. 다시 확인해 주세요." }
  $dayRe = '^(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?(,(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?)*$'
  $n = 0
  foreach ($x in (Props $dd.spots)) {
    $n++
    if (-not $ids[$x.Name]) { Err "$file 에 없는 스팟 id: $($x.Name)"; continue }
    if ($x.Value.source -notmatch '^https?://') { Err "$file.$($x.Name).source 는 링크여야 해요" }
    $w = @($x.Value.w)
    if (-not $w.Count) { Err "$file.$($x.Name) 에 시간(w)이 없어요" }
    foreach ($v in $w) {
      if ((S $v.d) -notmatch $dayRe) { Err "$file.$($x.Name) 의 요일($($v.d))을 읽을 수 없어요" }
      if ($v.all -or $v.approx) { continue }
      if ((S $v.f) -notmatch '^\d{2}:\d{2}$' -or ((S $v.t) -notmatch '^\d{2}:\d{2}$' -and $v.t -ne 'close')) { Err "$file.$($x.Name) 의 시간($($v.f)–$($v.t))은 HH:MM 이어야 해요 (끝은 'close' 가능)" }
    }
  }
  Ok "$file $n 곳"
}
CheckDeals 'happy-hours.json'
CheckDeals 'lunch-specials.json'

# ── 음식 기사 언급 (press.json) ──
$pr = Load 'press.json'
if ($pr) {
  $n = 0
  foreach ($x in (Props $pr.items)) {
    if (-not $ids[$x.Name]) { Err "press 에 없는 스팟 id: $($x.Name)"; continue }
    if (@('food', 'dessert') -notcontains $ids[$x.Name].cat) { Warn "press.$($x.Name) 는 먹거리가 아니라 앱에서 쓰이지 않아요" }
    foreach ($p in @($x.Value)) {
      $n++
      if (-not ($p.outlet -and $p.title)) { Err "press.$($x.Name) 에 outlet/title 이 빠졌어요" }
      if ($p.url -notmatch '^https://') { Err "press.$($x.Name) 링크는 https 여야 해요: $($p.url)" }
      if (-not (IsDate $p.date)) { Err "press.$($x.Name).date 는 YYYY-MM-DD 여야 해요" }
      elseif (($today - (D $p.date)).Days -gt 30) { Warn "press.$($x.Name) 기사($(S $p.date))가 30일 지나 앱에서 안 보여요. 지워 주세요." }
    }
  }
  Ok "press 기사 $n 개"
}

# ── Reddit 언급 ──
$rd = Load 'reddit.json'
if ($rd) {
  CheckAge 'reddit.json' $rd.updatedAt
  foreach ($m in (Props $rd.mentions)) {
    if (-not $ids[$m.Name]) { Err "reddit 에 없는 스팟 id: $($m.Name)" }
    foreach ($p in @($m.Value.posts)) { if ($p.url -notmatch '^https://(www\.)?reddit\.com/') { Err "reddit.$($m.Name) 링크가 reddit.com 이 아니에요: $($p.url)" } }
  }
  Ok "reddit 언급 $((Props $rd.mentions).Count)곳 ($($rd.from) ~ $($rd.to))"
}

Write-Host ''
Write-Host "오류 $($errors.Count)개, 경고 $($warns.Count)개"
if ($errors.Count) { exit 1 }
