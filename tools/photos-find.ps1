# 스팟별 무료 사진 후보 찾기 (위키백과 대표 이미지 → 위키미디어 공용 라이선스 정보)
# - 이름이 맞는 문서 + 스팟 좌표와 1.5km 이내인 문서만 후보로 봐요
# - 지도/로고/SVG는 제외
# 결과는 tools/photos-candidates.json 에 저장해요 (사람이 검토한 뒤 data/spots.json에 반영)
param([double]$MaxKm = 1.5)

$root = Split-Path $PSScriptRoot -Parent
$ua = @{ 'User-Agent' = 'SpotMate/0.1 (https://github.com/jsp6forcode/spotmate)' }
$spots = (Get-Content (Join-Path $root 'data\spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$norm = { param($x) (($x -replace '\(.*?\)', '' -replace "[^a-z0-9 ]", '' ).ToLower() -replace '\b(the|park|regional|provincial|restaurant|and|bar|cafe)\b', '' -replace '\s+', ' ').Trim() }
function Strip-Html($h) { (($h -replace '<[^>]+>', '') -replace '&amp;', '&' -replace '\s+', ' ').Trim() }

$out = foreach ($s in $spots) {
  $q = "$($s.name) $(($s.area -split ',')[0]) British Columbia"
  try {
    $r = Invoke-RestMethod -Headers $ua ("https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=3&gsrsearch=" +
      [uri]::EscapeDataString($q) + "&prop=pageimages|coordinates&piprop=name&pilicense=free")
  } catch { continue }
  $pages = @($r.query.pages.PSObject.Properties.Value)
  $best = $null
  foreach ($p in $pages) {
    if (-not $p.pageimage -or -not $p.coordinates) { continue }
    if ($p.pageimage -match '(?i)\.svg$|logo|map|locator|flag|coat_of_arms|seal') { continue }
    $c = $p.coordinates[0]
    $km = [math]::Sqrt([math]::Pow(($c.lat - $s.lat) * 111, 2) + [math]::Pow(($c.lon - $s.lng) * 73, 2))
    $a = & $norm $s.name; $b = & $norm $p.title
    $nameOk = $a -and $b -and ($b.Contains($a) -or $a.Contains($b))
    if ($km -le $MaxKm -and $nameOk) { $best = $p; $best | Add-Member km ([math]::Round($km, 2)) -Force; break }
  }
  Start-Sleep -Milliseconds 200
  if (-not $best) { continue }
  $file = 'File:' + $best.pageimage
  $ii = Invoke-RestMethod -Headers $ua ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=" + [uri]::EscapeDataString($file))
  $info = (@($ii.query.pages.PSObject.Properties.Value)[0]).imageinfo
  if (-not $info) { continue }
  $m = $info[0].extmetadata
  [pscustomobject]@{
    id = $s.id; name = $s.name; article = $best.title; km = $best.km; file = $best.pageimage
    url = $info[0].thumburl; source = $info[0].descriptionurl
    credit = Strip-Html $m.Artist.value; license = $m.LicenseShortName.value; licenseUrl = $m.LicenseUrl.value
  }
}
$path = Join-Path $PSScriptRoot 'photos-candidates.json'
$out | ConvertTo-Json -Depth 4 | Out-File $path -Encoding utf8
"후보 $(@($out).Count) / $($spots.Count)  → $path"
$out | Format-Table id, article, km, license, credit -AutoSize | Out-String -Width 250
