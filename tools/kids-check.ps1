# 아이 동반 적합도 확인용: Places API (New)에서
#  - goodForChildren (Google의 "어린이에게 적합" 속성)
#  - 최근 리뷰 5개 중 아이 관련 단어가 나온 리뷰 수
# 를 조회해 콘솔에만 출력해요. (약관상 리뷰/속성은 저장하지 않아요)
#
# 사용법:
#   기존 스팟 확인:  powershell -ExecutionPolicy Bypass -File tools\kids-check.ps1 -Mode existing
#   새 후보 찾기:    powershell -ExecutionPolicy Bypass -File tools\kids-check.ps1 -Mode discover
param([ValidateSet('existing', 'discover')][string]$Mode = 'existing', [double]$MinRating = 4.3, [int]$MinReviews = 500)

$root = Split-Path $PSScriptRoot -Parent
$key = ((Get-Content (Join-Path $root '.env.local') | Where-Object { $_ -match '^\s*GOOGLE_PLACES_API_KEY\s*=' } | Select-Object -First 1) -replace '^\s*GOOGLE_PLACES_API_KEY\s*=\s*', '').Trim()
if (-not $key) { throw ".env.local에 GOOGLE_PLACES_API_KEY가 없어요." }
$kidWords = '\b(kids?|child(ren)?|toddlers?|bab(y|ies)|little ones?|family|families|stroller|playground|play area|son|daughter)\b'

function Get-KidMentions($place) {
  @($place.reviews | Where-Object { ($_.text.text + ' ' + $_.originalText.text) -match $kidWords }).Count
}
function Read-Error($err) {
  $b = ''; try { $b = (New-Object IO.StreamReader($err.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
  [regex]::Match($b, '"reason":\s*"([^"]+)"').Groups[1].Value
}

$calls = 0
if ($Mode -eq 'existing') {
  $spots = (Get-Content (Join-Path $root 'data\spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
  $rows = foreach ($s in $spots) {
    try {
      $p = Invoke-RestMethod -Uri "https://places.googleapis.com/v1/places/$($s.placeId)" -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'goodForChildren,reviews' }
      $calls++
      [pscustomobject]@{ id = $s.id; cat = $s.cat; name = $s.name; goodForChildren = $p.goodForChildren; kidReviews = "$(Get-KidMentions $p)/$(@($p.reviews).Count)" }
    } catch { [pscustomobject]@{ id = $s.id; cat = $s.cat; name = $s.name; goodForChildren = 'ERR ' + (Read-Error $_); kidReviews = '' } }
  }
  "API 호출 $calls 회 (Place Details Enterprise + Atmosphere, 월 1,000회 무료)"
  $rows | Format-Table -AutoSize | Out-String -Width 300
  return
}

# 새 후보 찾기: 쇼핑몰, 실내 놀이터, 농장, 도서관 등 아이 동반 장소
$queries = @(
  'shopping mall with kids play area Coquitlam', 'shopping mall Burnaby', 'shopping mall Surrey BC', 'shopping mall Richmond BC',
  'shopping mall North Vancouver', 'shopping mall Vancouver', 'indoor playground Coquitlam', 'indoor playground Burnaby',
  'indoor playground Surrey BC', 'indoor playground Richmond BC', 'indoor playground Vancouver', 'kids activities Langley BC',
  'family farm Langley BC', 'public library Coquitlam', 'splash park Vancouver', 'wave pool Metro Vancouver', 'family attractions Surrey BC'
)
$fields = 'places.id,places.displayName,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.formattedAddress,places.goodForChildren,places.reviews'
$seen = @{}
$rows = :outer foreach ($q in $queries) {
  $body = @{ textQuery = $q; pageSize = 20; languageCode = 'en'; locationBias = @{ circle = @{ center = @{ latitude = 49.22; longitude = -122.95 }; radius = 40000.0 } } } | ConvertTo-Json -Depth 5
  try {
    $res = Invoke-RestMethod -Method Post -Uri 'https://places.googleapis.com/v1/places:searchText' -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = $fields } `
      -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
    $calls++
  } catch { Write-Warning "'$q' 실패: $(Read-Error $_)"; if ([int]$_.Exception.Response.StatusCode -in 400, 401, 403) { break outer }; continue }
  foreach ($p in $res.places) {
    if ($seen.ContainsKey($p.id)) { continue }; $seen[$p.id] = $true
    $m = Get-KidMentions $p
    [pscustomobject]@{ name = $p.displayName.text; rating = $p.rating; reviews = [int]$p.userRatingCount; kids = $p.goodForChildren; kidReviews = "$m/$(@($p.reviews).Count)"; m = $m
      type = $p.primaryTypeDisplayName.text; address = ($p.formattedAddress -replace ', Canada$', ''); placeId = $p.id; query = $q }
  }
}
"API 호출 $calls 회 (Text Search Enterprise + Atmosphere, 월 1,000회 무료)"
$rows | Where-Object { $_.rating -ge $MinRating -and $_.reviews -ge $MinReviews -and ($_.kids -eq $true -or $_.m -ge 2) } |
  Sort-Object query, @{ e = { $_.reviews }; Descending = $true } |
  Format-Table name, rating, reviews, kids, kidReviews, type, address, placeId -AutoSize | Out-String -Width 400
