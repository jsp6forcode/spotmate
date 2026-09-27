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
