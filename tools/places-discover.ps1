# 후보 장소 발굴용: Places API (New) Text Search로 카테고리별 검색어를 조회해
# 평점/리뷰 수가 높은 곳을 콘솔에 표로 보여줘요.
# Google 약관상 평점, 리뷰 수는 저장하면 안 되므로 파일로 남기지 않고 화면에만 출력해요.
#
# 준비: 프로젝트 폴더에 .env.local 파일을 만들고 한 줄 입력 (git에 올라가지 않아요)
#   GOOGLE_PLACES_API_KEY=발급받은키
# 사용법: powershell -ExecutionPolicy Bypass -File tools\places-discover.ps1 [-MinRating 4.5] [-MinReviews 500]
# -Only 'ramen in Vancouver','parks in Vancouver' 처럼 일부 검색어만 다시 조회할 수 있어요.
# -Set metro 로 메트로 밴쿠버 교외 지역 검색어 세트를 써요.
param([double]$MinRating = 4.5, [int]$MinReviews = 500, [string[]]$Only = @(), [string]$Set = 'vancouver')

$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) { throw ".env.local 파일이 없어요. GOOGLE_PLACES_API_KEY=... 한 줄을 넣어 만들어 주세요." }
$key = (Get-Content $envFile | Where-Object { $_ -match '^\s*GOOGLE_PLACES_API_KEY\s*=' } | Select-Object -First 1) -replace '^\s*GOOGLE_PLACES_API_KEY\s*=\s*', ''
if (-not $key) { throw ".env.local에 GOOGLE_PLACES_API_KEY 값이 없어요." }

# 카테고리별 발굴 검색어 (한 번에 최대 20곳씩)
$queries = [ordered]@{
  food   = @('best restaurants in Vancouver', 'brunch in Vancouver', 'bakery in Vancouver', 'dim sum in Richmond BC',
             'ramen in Vancouver', 'seafood restaurant Vancouver', 'cafe in Vancouver', 'food market Vancouver')
  hidden = @('parks in Vancouver', 'hiking trails North Vancouver', 'gardens in Vancouver', 'viewpoints West Vancouver',
             'beaches in Vancouver', 'museums in Vancouver', 'lakes near Vancouver BC', 'tourist attractions Burnaby')
}

if ($Set -eq 'metro') {
  $queries = [ordered]@{
    food   = @('best restaurants in Surrey BC', 'best restaurants in Burnaby', 'best restaurants in Richmond BC', 'best restaurants in Coquitlam',
               'best restaurants in North Vancouver', 'best restaurants in New Westminster', 'best restaurants in Langley BC', 'best restaurants in Port Moody')
    hidden = @('parks in Surrey BC', 'parks in Coquitlam', 'parks in Langley BC', 'parks in Delta BC', 'hiking trails Maple Ridge',
               'parks in Port Moody', 'parks in Richmond BC', 'tourist attractions Surrey BC', 'tourist attractions New Westminster', 'tourist attractions Langley BC')
  }
}
$fields = 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.location'
$headers = @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = $fields }
$calls = 0
$seen = @{}
$rows = :outer foreach ($cat in $queries.Keys) {
  foreach ($q in $queries[$cat]) {
    if ($Only.Count -and $q -notin $Only) { continue }
    $body = @{
      textQuery = $q; pageSize = 20; languageCode = 'en'
      locationBias = @{ circle = @{ center = @{ latitude = 49.25; longitude = -123.1 }; radius = 30000.0 } }
    } | ConvertTo-Json -Depth 5
    try {
      $res = Invoke-RestMethod -Method Post -Uri 'https://places.googleapis.com/v1/places:searchText' -Headers $headers `
        -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
      $calls++
    } catch {
      $detail = ''
      $resp = $_.Exception.Response
      if ($resp) { try { $detail = (New-Object IO.StreamReader($resp.GetResponseStream())).ReadToEnd() } catch {} }
      $reason = if ($detail -match '"reason":\s*"([^"]+)"') { $Matches[1] } else { '' }
      Write-Warning "'$q' 조회 실패: $($_.Exception.Message) $reason"
      # 권한/키 문제는 다른 검색어도 똑같이 실패하므로 바로 멈춤
      if ($resp -and [int]$resp.StatusCode -in 400, 401, 403) {
        if ($reason -eq 'API_KEY_SERVICE_BLOCKED') { Write-Warning '키의 API 제한사항에 "Places API (New)"가 체크돼 있는지 확인해 주세요.' }
        elseif ($reason -eq 'SERVICE_DISABLED') { Write-Warning '프로젝트에서 "Places API (New)"를 사용 설정해 주세요.' }
        elseif ($reason -eq 'API_KEY_INVALID') { Write-Warning '.env.local의 키 값이 올바른지 확인해 주세요.' }
        elseif ($reason -eq 'BILLING_DISABLED') { Write-Warning '프로젝트에 결제 계정이 연결돼 있는지 확인해 주세요.' }
        break outer
      }
      continue
    }
    foreach ($p in $res.places) {
      if ($seen.ContainsKey($p.id)) { continue }
      $seen[$p.id] = $true
      [pscustomobject]@{
        cat = $cat; name = $p.displayName.text; rating = $p.rating; reviews = [int]$p.userRatingCount
        type = $p.primaryTypeDisplayName.text; address = ($p.formattedAddress -replace ', Canada$', '')
        lat = [math]::Round($p.location.latitude, 4); lng = [math]::Round($p.location.longitude, 4); placeId = $p.id; query = $q
      }
    }
  }
}

"API 호출 $calls 회 (Text Search Enterprise, 월 1,000회 무료)"
$rows | Where-Object { $_.rating -ge $MinRating -and $_.reviews -ge $MinReviews } |
  Sort-Object cat, @{ e = { $_.rating * [math]::Log10($_.reviews + 1) }; Descending = $true } |
  Format-Table cat, name, rating, reviews, type, address, lat, lng, placeId -AutoSize | Out-String -Width 400
