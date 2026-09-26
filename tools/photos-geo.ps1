# 사진이 없는 스팟에 대해 위키미디어 공용의 "위치 기반 검색"(geosearch)으로 근처에서 찍힌 무료 사진 후보를 찾아요.
# 파일 이름에 스팟 이름 단어가 들어간 사진을 우선하고, 없으면 가장 가까운 사진을 후보로 둬요.
# 결과는 검토용 JSON(-Out)으로 저장해요. 사람이 눈으로 확인한 뒤에만 data/spots.json에 넣어요.
param([string]$Out = "$env:TEMP\spotmate-photo-geo.json")

$root = Split-Path $PSScriptRoot -Parent
$ua = @{ 'User-Agent' = 'SpotMate/0.1 (https://github.com/jsp6forcode/spotmate)' }
$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots | Where-Object { -not $_.photo }
function Strip-Html($h) { (($h -replace '<[^>]+>', '') -replace '&amp;', '&' -replace '\s+', ' ').Trim() }
$stop = 'the','and','park','regional','restaurant','cafe','bar','kitchen','co','bakery','house','centre','center','of'

$results = foreach ($s in $spots) {
  $radius = if ($s.cat -in 'food', 'dessert') { 120 } else { 500 }
  try {
    $g = Invoke-RestMethod -Headers $ua ("https://commons.wikimedia.org/w/api.php?action=query&format=json&list=geosearch&gsnamespace=6&gslimit=30" +
      "&gsradius=$radius&gscoord=$($s.lat)|$($s.lng)")
  } catch { continue }
  Start-Sleep -Milliseconds 150
  $words = @(($s.name.ToLower() -replace "[^a-z0-9 ]", ' ') -split '\s+' | Where-Object { $_.Length -ge 3 -and $_ -notin $stop })
  $cands = @($g.query.geosearch | Where-Object { $_.title -match '(?i)\.(jpe?g|png)$' -and $_.title -notmatch '(?i)map|logo|plan|diagram|sign' } | ForEach-Object {
    $t = $_.title.ToLower(); $hits = @($words | Where-Object { $t.Contains($_) }).Count
    [pscustomobject]@{ title = $_.title; dist = $_.dist; hits = $hits; score = $hits * 1000 - $_.dist }
  } | Sort-Object score -Descending)
  if (-not $cands.Count) { continue }
  # 식당/카페는 이름이 파일명에 있어야만 후보로 봐요 (근처 아무 건물 사진 방지)
  if ($s.cat -in 'food', 'dessert' -and $cands[0].hits -eq 0) { continue }
  $pick = $cands[0]
  $ii = Invoke-RestMethod -Headers $ua ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=" + [uri]::EscapeDataString($pick.title))
  $info = (@($ii.query.pages.PSObject.Properties.Value)[0]).imageinfo
  if (-not $info) { continue }
  $m = $info[0].extmetadata
  [pscustomobject]@{ id = $s.id; cat = $s.cat; name = $s.name; file = $pick.title; dist = $pick.dist; hits = $pick.hits
    url = $info[0].thumburl; source = $info[0].descriptionurl; credit = Strip-Html $m.Artist.value; license = $m.LicenseShortName.value; licenseUrl = $m.LicenseUrl.value }
}
$results | ConvertTo-Json -Depth 3 | Out-File $Out -Encoding utf8
"후보 $(@($results).Count) / 사진 없는 스팟 $(@($spots).Count) → $Out"
