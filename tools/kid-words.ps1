# 아이 언급 횟수 확인 (사용자 규칙, 2026-10-01):
#   리뷰(최대 5개)에 아기·아이 관련 단어가 모두 합쳐 3번 이상 나와야 SpotMate에 보여줘요.
#   단어: kid(s), kiddo, child(ren), toddler, baby/babies, infant, little one(s), stroller, pram, son, daughter,
#         grandkid, grandchild(ren), preschool(er), youngster, playground, play area, tot(s)  ("family"는 너무 넓어서 빼요)
#   리뷰 글은 저장하지 않고, 센 숫자만 -Out 임시 파일(스크래치 폴더)에 써요. 저장소에는 결과(통과 못 하면 "notKid": true)만 넣어요.
#
# 사용법:
#   새로 더한 곳만:  powershell -ExecutionPolicy Bypass -File tools\kid-words.ps1 -Ids a,b,c
#   아이 장소 전체:  powershell -ExecutionPolicy Bypass -File tools\kid-words.ps1 -Out <스크래치>\kid-words.json
#   placeId가 없는 곳은 이름+좌표로 찾아서(500 m 안) foundPlaceId로 보여줘요 (Place ID는 저장해도 돼요)
param([string[]]$Ids, [string]$Out, [int]$Min = 3)
if ($Ids) { $Ids = @($Ids | ForEach-Object { $_ -split ',' } | Where-Object { $_ }) }

$root = Split-Path $PSScriptRoot -Parent
$key = ((Get-Content (Join-Path $root '.env.local') | Where-Object { $_ -match '^\s*GOOGLE_PLACES_API_KEY\s*=' } | Select-Object -First 1) -replace '^\s*GOOGLE_PLACES_API_KEY\s*=\s*', '').Trim()
if (-not $key) { throw ".env.local에 GOOGLE_PLACES_API_KEY가 없어요." }
$kidWords = '(?i)\b(kids?|kiddos?|child(ren)?|toddlers?|bab(y|ies)|infants?|little ones?|strollers?|prams?|sons?|daughters?|grandkids?|grandchild(ren)?|preschool(ers?)?|youngsters?|playgrounds?|play areas?|tots?)\b'

function Count-KidWords($place) {
  $n = 0
  foreach ($r in @($place.reviews)) {
    # 원문이 있으면 원문만 (번역본까지 세면 두 번 세져요)
    $t = if ($r.originalText.text) { $r.originalText.text } else { $r.text.text }
    $n += [regex]::Matches([string]$t, $kidWords).Count
  }
  $n
}
function Km($a1, $o1, $a2, $o2) {
  $r = [Math]::PI / 180; $x = ($o2 - $o1) * $r * [Math]::Cos(($a1 + $a2) / 2 * $r); $y = ($a2 - $a1) * $r
  6371 * [Math]::Sqrt($x * $x + $y * $y)
}
function Read-Error($err) {
  $b = ''; try { $b = (New-Object IO.StreamReader($err.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
  [regex]::Match($b, '"reason":\s*"([^"]+)"').Groups[1].Value
}

$spots = (Get-Content (Join-Path $root 'data\spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$spots = if ($Ids) { @($spots | Where-Object { $_.id -in $Ids }) } else { @($spots | Where-Object { ($_.kids -or $_.family -or $_.play) -and $_.cat -notmatch 'food|dessert' }) }
$calls = 0
$rows = foreach ($s in $spots) {
  try {
    $found = ''
    if ($s.placeId) {
      $p = Invoke-RestMethod -Uri "https://places.googleapis.com/v1/places/$($s.placeId)" -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'reviews,userRatingCount' }
    } else {
      $body = @{ textQuery = "$($s.name) $($s.area)"; pageSize = 1; languageCode = 'en'; locationBias = @{ circle = @{ center = @{ latitude = $s.lat; longitude = $s.lng }; radius = 300.0 } } } | ConvertTo-Json -Depth 5
      $res = Invoke-RestMethod -Method Post -Uri 'https://places.googleapis.com/v1/places:searchText' -Headers @{ 'X-Goog-Api-Key' = $key; 'X-Goog-FieldMask' = 'places.id,places.displayName,places.location,places.reviews,places.userRatingCount' } `
        -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
      $p = @($res.places)[0]
      # 엉뚱한 곳이 잡히면(500 m 밖) 세지 않아요
      if (-not $p -or (Km $s.lat $s.lng $p.location.latitude $p.location.longitude) -gt 0.5) { throw 'not found nearby' }
      $found = $p.id
    }
    $calls++
    $n = Count-KidWords $p
    [pscustomobject]@{ id = $s.id; name = $s.name; kidWords = $n; reviews = @($p.reviews).Count; total = [int]$p.userRatingCount; pass = ($n -ge $Min); foundPlaceId = $found }
  } catch { [pscustomobject]@{ id = $s.id; name = $s.name; kidWords = -1; reviews = 0; total = 0; pass = $null; foundPlaceId = ''; error = "$(Read-Error $_) $($_.Exception.Message)".Trim() } }
}
"API 호출 $calls 회 (월 1,000회 무료)"
if ($Out) { $rows | ConvertTo-Json -Depth 3 | Set-Content -Path $Out -Encoding UTF8 }
"통과 $(@($rows | Where-Object pass).Count) / 미달 $(@($rows | Where-Object { $_.pass -eq $false }).Count) / 확인 못 함 $(@($rows | Where-Object { $null -eq $_.pass }).Count)"
$rows | Where-Object { -not $_.pass } | Format-Table id, name, kidWords, reviews, total, error -AutoSize | Out-String -Width 300
