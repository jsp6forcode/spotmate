# 월 1회 리뷰 기준 스팟 점검 (GitHub Actions에서 실행, 로컬에서도 실행 가능)
# 대상: 히든젬(gem), 아이 동반(family)
# Places API로 영업 여부와 평점/리뷰 수 기준 충족 여부만 확인하고,
# 결과는 data/review-status.json 에 "통과 못 한 스팟 id + 이유"만 기록해요.
# (Google 약관상 평점·리뷰 수 값 자체는 저장하지 않아요)
#
# 키: 환경변수 GOOGLE_PLACES_API_KEY (Actions) 또는 .env.local (로컬)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = $env:GOOGLE_PLACES_API_KEY
if (-not $key -and (Test-Path (Join-Path $root '.env.local'))) {
  $key = ((Get-Content (Join-Path $root '.env.local') | Where-Object { $_ -match '^\s*GOOGLE_PLACES_API_KEY\s*=' } | Select-Object -First 1) -replace '^\s*GOOGLE_PLACES_API_KEY\s*=\s*', '').Trim()
}
if (-not $key) { throw 'GOOGLE_PLACES_API_KEY가 없어요.' }

# 점검 기준 (app.js의 안내 문구와 같아야 해요). 두 가지만 봐요:
#   gem    = 히든젬: 평점 4.6+ · 리뷰 300+ 못 넘으면 사이트에서 숨겨요
#   family = 아이 동반: 평점 4.0+ · 리뷰 50+ 못 넘어도 숨기지 않고 lowFamily 에만 적어요
# 모든 장소 공통: 폐업(영구·임시)이거나 Google 지도에서 사라졌으면 숨겨요
$rules = @(
  @{ name = 'gem';    test = { param($s) $s.gem };    minRating = 4.6; minReviews = 300 },
  @{ name = 'family'; test = { param($s) $s.family }; minRating = 4.0; minReviews = 50 }
)

$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$keepWhenTempClosed = @('bvm')   # 시즌 한정으로 열리는 곳 (Burnaby Village Museum): Google은 임시 휴업으로 표시하지만 행사 때 열려서 계속 보여줘요 (사용자, 2026-10-14)
$inactive = [ordered]@{}
$lowFamily = [ordered]@{}   # family 인데 평점·리뷰 수 기준엔 못 미치는 곳 (숨기지 않고 표시만 달라져요)
$checked = 0; $calls = 0; $errors = 0
$failed = New-Object System.Collections.Generic.List[string]

foreach ($s in $spots) {
  $rule = $rules | Where-Object { & $_.test $s } | Select-Object -First 1
  if (-not $rule) { continue }
  $checked++
  try {
    $p = Invoke-RestMethod -Uri "https://places.googleapis.com/v1/places/$($s.placeId)" `
      -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'businessStatus,rating,userRatingCount' }
    $calls++
  } catch {
    $status = 0; try { $status = [int]$_.Exception.Response.StatusCode } catch {}
    if ($status -eq 404) { $inactive[$s.id] = 'not found on Google Maps'; continue }
    if ($status -in 401, 403) { throw "API 키 권한 오류($status). 키와 API 제한사항을 확인하세요." }
    # 잘못된 키·API 미사용·결제 꺼짐은 400으로 와요 (잘못된 placeId도 400이라 이유로 구분)
    $body = "$($_.ErrorDetails.Message)"
    if (-not $body) {   # PS 5.1은 ErrorDetails가 비어 있을 때가 있어 응답 본문을 직접 읽어요
      try { $body = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    }
    if ($status -eq 400 -and $body -match 'API_KEY_\w+|SERVICE_DISABLED|BILLING_DISABLED') {
      throw "API 키/프로젝트 설정 오류($status): $($Matches[0])"
    }
    Write-Warning "$($s.id): 확인 실패 ($status) - 이번 달은 기존 상태 유지"
    $errors++; $failed.Add($s.id); continue
  }
  if ($p.businessStatus -eq 'CLOSED_PERMANENTLY') { $inactive[$s.id] = 'permanently closed'; continue }
  if ($p.businessStatus -eq 'CLOSED_TEMPORARILY' -and $keepWhenTempClosed -notcontains $s.id) { $inactive[$s.id] = 'temporarily closed'; continue }
  if ([double]$p.rating -lt $rule.minRating -or [int]$p.userRatingCount -lt $rule.minReviews) {
    # 아이 동반(family) 장소는 평점·리뷰 수가 모자라도 숨기지 않아요 (동네 공원·시설은 리뷰가 적어요). 기준 문구만 빼도록 lowFamily 에 적고, 폐업·Google에서 사라짐만 숨겨요
    if ($rule.name -eq 'family') { $lowFamily[$s.id] = 'below the Google rating or review minimum' }
    else { $inactive[$s.id] = "no longer meets the $($rule.name) criteria" }
  }
}

# 절반 넘게 실패했으면 점검 자체가 잘못된 것이라 파일을 건드리지 않고 실패로 끝내요
if ($errors * 2 -gt $checked) { throw "확인 실패가 너무 많아요 ($errors / $checked 곳). review-status.json은 그대로 둬요." }

# 확인에 실패한 스팟만 지난달 결과를 이어받아요 (이번 달 통과한 스팟은 다시 보여줘요)
$statusPath = Join-Path $root 'data/review-status.json'
if ($failed.Count -gt 0 -and (Test-Path $statusPath)) {
  $prev = Get-Content $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($prop in $prev.inactive.PSObject.Properties) {
    if ($failed.Contains($prop.Name) -and -not $inactive.Contains($prop.Name)) { $inactive[$prop.Name] = $prop.Value }
  }
  if ($prev.lowFamily) {
    foreach ($prop in $prev.lowFamily.PSObject.Properties) {
      if ($failed.Contains($prop.Name) -and -not $lowFamily.Contains($prop.Name)) { $lowFamily[$prop.Name] = $prop.Value }
    }
  }
}

$result = [ordered]@{
  checkedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
  checked   = $checked
  inactive  = $inactive
  lowFamily = $lowFamily
}
$json = $result | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText($statusPath, $json + "`n", (New-Object Text.UTF8Encoding $false))
"점검 $checked 곳, API 호출 $calls 회, 숨김 $($inactive.Count) 곳, 기준 미달 표시만 바꿈(family) $($lowFamily.Count) 곳, 확인 실패 $errors 곳"
$inactive.GetEnumerator() | ForEach-Object { "  - $($_.Key): $($_.Value)" }
