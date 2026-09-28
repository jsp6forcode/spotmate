# 아이 동반 적합도 확인용: Places API (New)에서
#  - goodForChildren (Google의 "어린이에게 적합" 속성)
#  - 최근 리뷰 5개 중 아이 관련 단어가 나온 리뷰 수
# 를 조회해 콘솔에만 출력해요. (약관상 리뷰/속성은 저장하지 않아요)
#
# 사용법:
#   기존 스팟 확인:  powershell -ExecutionPolicy Bypass -File tools\kids-check.ps1 -Mode existing
#   새 후보 찾기:    powershell -ExecutionPolicy Bypass -File tools\kids-check.ps1 -Mode discover
#   새로 더한 곳만:  powershell -ExecutionPolicy Bypass -File tools\kids-check.ps1 -Ids a,b,c
#     placeId가 없는 스팟은 이름+좌표로 찾아서 placeId를 같이 보여줘요 (Place ID는 저장해도 돼요)
#   판단: goodForChildren=True 이면 "kids": true, 여기에 평점 4.0+·리뷰 50+ 이고 아이 언급 리뷰가 2개 이상이면 "family": true
#   검색어를 직접: -Mode discover -Search "spray park Surrey BC;playground Burnaby" (세미콜론으로 구분), -Out 파일로 후보 저장(임시 파일에만, 저장소에 넣지 않기)
param([ValidateSet('existing', 'discover')][string]$Mode = 'existing', [double]$MinRating = 4.0, [int]$MinReviews = 50, [string[]]$Ids, [string]$Search, [string]$Out)
# powershell -File 로 부르면 "a,b,c"가 한 덩어리로 와서 쉼표로 나눠요
if ($Ids) { $Ids = @($Ids | ForEach-Object { $_ -split ',' } | Where-Object { $_ }) }

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
  if ($Ids) { $spots = @($spots | Where-Object { $_.id -in $Ids }) }
  $rows = foreach ($s in $spots) {
    try {
      $found = ''
      if ($s.placeId) {
        $p = Invoke-RestMethod -Uri "https://places.googleapis.com/v1/places/$($s.placeId)" -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'goodForChildren,reviews,rating,userRatingCount' }
      } else {
        # placeId가 없으면 이름으로 검색 (스팟 좌표 300m 안)
        $body = @{ textQuery = "$($s.name) $($s.area)"; pageSize = 1; languageCode = 'en'; locationBias = @{ circle = @{ center = @{ latitude = $s.lat; longitude = $s.lng }; radius = 300.0 } } } | ConvertTo-Json -Depth 5
        $res = Invoke-RestMethod -Method Post -Uri 'https://places.googleapis.com/v1/places:searchText' -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'places.id,places.displayName,places.goodForChildren,places.reviews,places.rating,places.userRatingCount' } `
          -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
        $p = @($res.places)[0]
        if (-not $p) { throw 'not found' }
        $found = "$($p.id) ($($p.displayName.text))"
      }
      $calls++
      [pscustomobject]@{ id = $s.id; cat = $s.cat; name = $s.name; goodForChildren = $p.goodForChildren; rating = $p.rating; reviews = $p.userRatingCount; kidReviews = "$(Get-KidMentions $p)/$(@($p.reviews).Count)"; foundPlaceId = $found }
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
if ($Search) {
  # 파일 경로면 한 줄에 검색어 하나 (powershell -File 인자로는 공백 들어간 긴 목록이 잘려요)
  $list = if (Test-Path $Search) { Get-Content $Search -Encoding UTF8 } else { $Search -split ';' }
  $queries = @($list | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
# 이미 spots.json에 있는 곳(placeId)은 후보에서 빼요
$known = @{}; foreach ($s in (Get-Content (Join-Path $root 'data\spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots) { if ($s.placeId) { $known[$s.placeId] = $s.id } }
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
$ok = @($rows | Where-Object { -not $known[$_.placeId] -and $_.rating -ge $MinRating -and $_.reviews -ge $MinReviews -and ($_.kids -eq $true -or $_.m -ge 2) } |
  Sort-Object query, @{ e = { $_.reviews }; Descending = $true })
"새 후보 $($ok.Count) 곳 (이미 있는 곳 제외)"
if ($Out) { $ok | Select-Object name, type, address, placeId, kids, m, query | ConvertTo-Json -Depth 3 | Set-Content -Path $Out -Encoding UTF8 }
$ok | Format-Table name, rating, reviews, kids, kidReviews, type, address, placeId -AutoSize | Out-String -Width 400
