# 새로 생긴 곳 발굴 ("Just opened"): 평점 4.9+, 리뷰 30+ 이면서 최근 6개월 안에 연 것으로 보이는 곳
# 장소 데이터에는 "개업일"이 없어서, 돌려주는 리뷰(최대 5개)가 모두 최근 6개월 안이고 리뷰 수가 적은 곳을 후보로 보여줘요.
# 후보는 반드시 사람이 개업 기사·공식 SNS로 개업 시기를 확인한 뒤에만 data/spots.json에 "opened": "YYYY-MM"으로 넣어요.
# Google 약관상 평점·리뷰 수·리뷰는 저장하지 않고 화면에만 출력해요 (Place ID는 저장 가능).
# 사용법: powershell -ExecutionPolicy Bypass -File tools\new-openings.ps1 [-Months 6] [-MinRating 4.9] [-MinReviews 30] [-Recheck]
#   -Recheck: 이미 "opened"가 있는 스팟이 아직 기준(평점 4.9+, 리뷰 30+)을 넘는지만 확인해요
param([int]$Months = 6, [double]$MinRating = 4.9, [int]$MinReviews = 30, [int]$MaxReviews = 400, [switch]$Recheck)

$root = Split-Path $PSScriptRoot -Parent
$key = ((Get-Content (Join-Path $root '.env.local') | Where-Object { $_ -match '^\s*GOOGLE_PLACES_API_KEY\s*=' } | Select-Object -First 1) -replace '^\s*GOOGLE_PLACES_API_KEY\s*=\s*', '').Trim()
if (-not $key) { throw ".env.local에 GOOGLE_PLACES_API_KEY가 없어요." }
$cut = (Get-Date).ToUniversalTime().AddMonths(-$Months)
$spots = (Get-Content (Join-Path $root 'data\spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$have = @{}; foreach ($s in $spots) { if ($s.placeId) { $have[$s.placeId] = $s.id } }
function Read-Error($err) { $b = ''; try { $b = (New-Object IO.StreamReader($err.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}; [regex]::Match($b, '"reason":\s*"([^"]+)"').Groups[1].Value }
$calls = 0

if ($Recheck) {
  $rows = foreach ($s in @($spots | Where-Object { $_.opened })) {
    try {
      $p = Invoke-RestMethod -Uri "https://places.googleapis.com/v1/places/$($s.placeId)" -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'rating,userRatingCount,businessStatus' }; $calls++
      [pscustomobject]@{ id = $s.id; opened = $s.opened; ok = ($p.rating -ge $MinRating -and $p.userRatingCount -ge $MinReviews -and $p.businessStatus -eq 'OPERATIONAL'); status = $p.businessStatus }
    } catch { [pscustomobject]@{ id = $s.id; opened = $s.opened; ok = $false; status = 'ERR ' + (Read-Error $_) } }
  }
  "API 호출 $calls 회"; $rows | Format-Table -AutoSize | Out-String -Width 200; return
}

$areas = 'Vancouver', 'Burnaby', 'Richmond BC', 'Surrey BC', 'Coquitlam', 'North Vancouver', 'New Westminster', 'Langley BC'
$kinds = 'new restaurant', 'new cafe', 'new bakery', 'new dessert shop'
$extra = 'newly opened restaurant Vancouver', 'grand opening Vancouver restaurant', 'new bubble tea Vancouver', 'new ramen Vancouver',
         'new indoor playground Metro Vancouver', 'new attraction Vancouver', 'new brunch spot Vancouver', 'new korean restaurant Vancouver'
$queries = @(foreach ($a in $areas) { foreach ($k in $kinds) { "$k $a" } }) + $extra
$fields = 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.businessStatus,places.reviews'
$seen = @{}
$rows = :outer foreach ($q in $queries) {
  $body = @{ textQuery = $q; pageSize = 20; languageCode = 'en'; locationBias = @{ circle = @{ center = @{ latitude = 49.22; longitude = -122.95 }; radius = 40000.0 } } } | ConvertTo-Json -Depth 5
  try {
    $res = Invoke-RestMethod -Method Post -Uri 'https://places.googleapis.com/v1/places:searchText' -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = $fields } `
      -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)); $calls++
  } catch { Write-Warning "'$q' 실패: $(Read-Error $_)"; if ([int]$_.Exception.Response.StatusCode -in 400, 401, 403) { break outer }; continue }
  foreach ($p in $res.places) {
    if ($seen.ContainsKey($p.id)) { continue }; $seen[$p.id] = 1
    if ($p.businessStatus -ne 'OPERATIONAL' -or $p.rating -lt $MinRating -or $p.userRatingCount -lt $MinReviews -or $p.userRatingCount -gt $MaxReviews) { continue }
    $dates = @($p.reviews | ForEach-Object { [datetime]$_.publishTime } | Sort-Object)
    if (-not $dates.Count -or $dates[0] -lt $cut) { continue }   # 돌려준 리뷰 중 하나라도 6개월보다 오래됐으면 새로 연 곳이 아님
    [pscustomobject]@{ name = $p.displayName.text; rating = $p.rating; reviews = [int]$p.userRatingCount; oldestReview = $dates[0].ToString('yyyy-MM-dd')
      type = $p.primaryTypeDisplayName.text; address = ($p.formattedAddress -replace ', Canada$', ''); placeId = $p.id; inSpots = $have[$p.id]; query = $q }
  }
}
"API 호출 $calls 회 (Text Search Enterprise + Atmosphere, 월 1,000회 무료)"
"후보 $(@($rows).Count)곳 — 돌려준 리뷰가 모두 $($cut.ToString('yyyy-MM-dd')) 이후. 개업 시기는 기사·공식 SNS로 꼭 확인하세요."
$rows | Sort-Object oldestReview -Descending | Format-Table name, rating, reviews, oldestReview, type, address, placeId, inSpots -AutoSize | Out-String -Width 400
