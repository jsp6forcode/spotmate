# 월 1회 리뷰 기준 스팟 점검 (GitHub Actions에서 실행, 로컬에서도 실행 가능)
# 대상: Vancouver classic(gem), 아이 동반(family)
# Places API로 영업 여부만 확인하고,
# 결과는 data/review-status.json 에 "숨길 스팟 id + 이유"만 기록해요.
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

# 점검 기준: gem·family 장소가 폐업(영구·임시)이거나 Google 지도에서 사라졌으면 숨겨요
#   평점·리뷰 수는 더 이상 재지 않아요. family 의 lowFamily(평점 4.0+ · 리뷰 50+ 미달 표시)는 지난 결과를 그대로 이어받아요
#   gem 평점 기준(4.6+ · 300+)도 2026-11-22에 뺐어요. 화면 문구에서도 숫자를 지웠어요 (app.js CLASSIC)
#
# 요금 (사용자 2026-11-22: 매달 무료 한도 안에서만): businessStatus 만 요청 = Place Details Pro (월 5,000회 무료).
#   rating·userRatingCount 를 넣으면 Enterprise(월 1,000회 무료, 넘으면 1,000회당 $20)로 바뀌니 넣지 마세요
$fields = 'businessStatus'

$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$keepWhenTempClosed = @('bvm')   # 시즌 한정으로 열리는 곳 (Burnaby Village Museum): Google은 임시 휴업으로 표시하지만 행사 때 열려서 계속 보여줘요 (사용자, 2026-10-14)
$inactive = [ordered]@{}
$lowFamily = [ordered]@{}   # family 인데 평점·리뷰 수 기준엔 못 미치는 곳 (숨기지 않고 표시만 달라져요)
$checked = 0; $calls = 0; $errors = 0
$failed = New-Object System.Collections.Generic.List[string]

foreach ($s in $spots) {
  if (-not ($s.gem -or $s.family)) { continue }
  $checked++
  try {
    $p = Invoke-RestMethod -Uri "https://places.googleapis.com/v1/places/$($s.placeId)" `
      -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = $fields }
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
}

# 절반 넘게 실패했으면 점검 자체가 잘못된 것이라 파일을 건드리지 않고 실패로 끝내요
if ($errors * 2 -gt $checked) { throw "확인 실패가 너무 많아요 ($errors / $checked 곳). review-status.json은 그대로 둬요." }

# 확인에 실패한 스팟만 지난달 결과를 이어받아요 (이번 달 통과한 스팟은 다시 보여줘요)
$statusPath = Join-Path $root 'data/review-status.json'
$prev = $null
if (Test-Path $statusPath) { $prev = Get-Content $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json }
if ($prev -and $failed.Count -gt 0) {
  foreach ($prop in $prev.inactive.PSObject.Properties) {
    if ($failed.Contains($prop.Name) -and -not $inactive.Contains($prop.Name)) { $inactive[$prop.Name] = $prop.Value }
  }
}
# lowFamily 는 이제 매달 다시 재지 않아요 (평점을 요청하면 Enterprise 요금이라). 지금도 family 인 곳의 지난 표시만 이어받아요
if ($prev -and $prev.lowFamily) {
  $familyIds = @{}; $spots | Where-Object { $_.family } | ForEach-Object { $familyIds[$_.id] = 1 }
  foreach ($prop in $prev.lowFamily.PSObject.Properties) {
    if ($familyIds.ContainsKey($prop.Name)) { $lowFamily[$prop.Name] = $prop.Value }
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
"점검 $checked 곳, API 호출 $calls 회 (모두 Place Details Pro), 숨김 $($inactive.Count) 곳, 기준 미달 표시 이어받음(family) $($lowFamily.Count) 곳, 확인 실패 $errors 곳"
$inactive.GetEnumerator() | ForEach-Object { "  - $($_.Key): $($_.Value)" }
