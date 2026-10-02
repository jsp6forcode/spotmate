# 구글 평점·리뷰 수를 data/ratings.json 에 저장해요 (카드와 상세 화면에 "★ 4.6 · 1.2k Google reviews"로 보여주기 위해)
# 주의: 평점 값을 저장하는 건 Places API 약관의 캐시 제한과 맞지 않을 수 있어요. 사이트 운영자가 알고 선택한 방식이에요.
# 대상: 아이 동반 장소(kids/family/play, notKid 제외) 중 placeId가 있는 곳
# 사용: powershell -File tools/ratings-collect.ps1 [-Limit 10] [-Refresh]
#   -Limit N  : 이번에 N곳만 새로 가져와요 (비용 확인용 시험 실행)
#   -Refresh  : 이미 받아 둔 곳도 다시 가져와요 (기본은 없는 곳만)
#   -Ids a,b  : 이 id의 장소만 가져와요
# 키: 환경변수 GOOGLE_PLACES_API_KEY 또는 .env.local

param([int]$Limit = 0, [switch]$Refresh, [string[]]$Ids)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$key = $env:GOOGLE_PLACES_API_KEY
if (-not $key -and (Test-Path (Join-Path $root '.env.local'))) {
  $key = ((Get-Content (Join-Path $root '.env.local') | Where-Object { $_ -match '^\s*GOOGLE_PLACES_API_KEY\s*=' } | Select-Object -First 1) -replace '^\s*GOOGLE_PLACES_API_KEY\s*=\s*', '').Trim()
}
if (-not $key) { throw 'GOOGLE_PLACES_API_KEY가 없어요.' }

$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$path = Join-Path $root 'data/ratings.json'
$have = [ordered]@{}
if (Test-Path $path) {
  $prev = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($p in $prev.spots.PSObject.Properties) { $have[$p.Name] = @($p.Value) }
}

$todo = @($spots | Where-Object { (-not $Ids -or $Ids -contains $_.id) -and $_.placeId -and -not $_.notKid -and ($_.kids -or $_.family -or $_.play) -and ($Refresh -or -not $have.Contains($_.id)) })
if ($Limit -gt 0) { $todo = $todo | Select-Object -First $Limit }
"가져올 곳 $(@($todo).Count) 곳"

$calls = 0; $errors = 0
foreach ($s in $todo) {
  try {
    $p = Invoke-RestMethod -Uri "https://places.googleapis.com/v1/places/$($s.placeId)" `
      -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'rating,userRatingCount' }
    $calls++
    if ($p.rating -and $p.userRatingCount) { $have[$s.id] = @([math]::Round([double]$p.rating, 1), [int]$p.userRatingCount) }
  } catch {
    $status = 0; try { $status = [int]$_.Exception.Response.StatusCode } catch {}
    if ($status -in 401, 403) { throw "API 키 권한 오류($status). 키와 API 제한사항을 확인하세요." }
    Write-Warning "$($s.id): 가져오기 실패 ($status)"; $errors++
  }
}

$result = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
  source    = 'Google Maps (Places API)'
  spots     = $have
}
[IO.File]::WriteAllText($path, ($result | ConvertTo-Json -Depth 4 -Compress) + "`n", (New-Object Text.UTF8Encoding $false))
"API 호출 $calls 회, 저장 $($have.Count) 곳, 실패 $errors 곳"
