# 검색용 안내 페이지 만들기: data/spots.json 에서 "종류 × 도시" 안내 페이지(guides/<slug>/index.html)와 sitemap.xml 을 만들어요.
# 앱(index.html)은 자바스크립트로 목록을 그려서 구글이 장소별 내용을 못 읽어요. 이 페이지들은 같은 데이터를 일반 HTML 글로 풀어 둔 거예요.
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-guides.ps1
# 평점·리뷰 수·리뷰 내용은 쓰지 않아요 (Google Places 약관). 아이 동반으로 확인된 곳(isKid)만 넣어요.
param(
  [int]$MinKindCity = 3,     # 종류×도시 페이지에 필요한 최소 장소 수
  [int]$MinCity = 6,         # 도시 전체 페이지
  [int]$MinKind = 6          # 종류 전체(메트로 밴쿠버) 페이지
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$site = 'https://tinytripsvan.ca'
$today = (Get-Date).ToString('yyyy-MM-dd')
$enc = New-Object System.Text.UTF8Encoding($false)
function Esc($t) { [System.Net.WebUtility]::HtmlEncode([string]$t) }
function Slug($t) { ($t.ToLower() -replace '&', 'and' -replace '[^a-z0-9]+', '-').Trim('-') }

# index.html 의 KINDS 와 같은 순서·같은 규칙 (key, 단수 이름, 복수 이름(페이지 제목), 정규식)
$KINDS = @(
  @('water', 'Spray park', 'Spray parks and splash pads', 'spray park$|^spray|splash|wading|water ?park|water play'),
  @('play', 'Playground', 'Playgrounds', '(?<!indoor )playground|tot lot|adventure play'),
  @('rides', 'Rides & amusements', 'Rides and amusement parks', '(?<!rainbow )\bplayland\b|amusement park|fun ?park|miniature railway|burnaby central railway'),
  @('indoorplay', 'Indoor play', 'Indoor play centres', 'indoor play(ground)?|play (centre|center|caf)|jungle|kidtropolis|play ?zone|fun ?land|bounce|fun centre'),
  @('gym', 'Kids gym', 'Kids gyms', 'gymnastics|parkour|kids gym|ninja|tumble|\bg force gym|my gym|movement centre'),
  @('trampoline', 'Trampoline park', 'Trampoline parks', 'trampoline|extreme air'),
  @('active', 'Active play', 'Climbing and active play', 'climb|boulder|parkour|gymnastics|ninja|kids gym|\bair park'),
  @('games', 'Games', 'Games and activities', 'laser|escape|\bvr\b|go-kart|kart track|bowling'),
  @('minigolf', 'Mini golf', 'Mini golf', 'mini ?golf|mini putt'),
  @('arcade', 'Arcade & mini golf', 'Arcades and mini golf', 'arcade|claw|mini golf|mini putt'),
  @('golf', 'Golf', 'Golf', 'golf (cent(re|er)|course|club)|(?<!mini)golf$'),
  @('wheels', 'Bike & skate', 'Bike and skate parks', 'bike park|bike (skills|terrain)|bmx|pump ?track|skate ?park'),
  @('arts', 'Arts & crafts', 'Arts and crafts', 'pottery|art studio|arts centre|(?<!& )cultural cent|craft|paint'),
  @('shop', 'Kids shop', 'Kids shops', '\btoys?\b|baby nook|book ?(store|shop)|kinder books'),
  @('library', 'Library', 'Libraries', 'librar(y|ies)'),
  @('pool', 'Pool', 'Swimming pools', 'pool|aquatic|swim'),
  @('rec', 'Rec centre', 'Rec centres', 'recreation|sports complex|community cent|leisure|ymca|family place|sportsplex'),
  @('mall', 'Shopping', 'Shopping centres', '\bikea\b|kids market|\bmall\b|park royal|metropolis|coquitlam centre|richmond centre|town centre|tsawwassen mills|oakridge|lansdowne|shopping'),
  @('museum', 'Museum', 'Museums', 'olympic experience'),
  @('rink', 'Ice rink', 'Ice rinks', 'ice rink|skating|arena|\bice\b|oval|canlan'),
  @('salmon', 'Salmon hatchery', 'Salmon hatcheries', 'hatchery'),
  @('birds', 'Wildlife & birds', 'Wildlife and bird watching', 'raptor|heron|\bbirds?\b|wildlife|sanctuary|\bfen\b|slough|polder|marshes'),
  @('pumpkin', 'Pumpkin patch', 'Pumpkin patches', 'pumpkin'),
  @('berry', 'Berry farm', 'Berry farms', 'berry farms?|u-pick berry'),
  @('aquarium', 'Aquarium', 'Aquariums', 'aquarium'),
  @('hologram', 'Hologram show', 'Hologram shows', 'hologram'),
  @('trail', 'Trail', 'Kid-friendly trails', 'biodiversity preserve'),
  @('farm', 'Farm & animals', 'Farms and animals', '\bfarms?\b|\bzoo\b|petting|animal'),
  @('museum', 'Museum', 'Museums', 'museum|gallery|science|planetarium|space cent|historic site|heritage village'),
  @('beach', 'Beach & lake', 'Beaches and lakes', 'beach|\blake\b'),
  @('garden', 'Garden', 'Gardens', 'garden|conservatory|arboretum'),
  @('trail', 'Trail', 'Kid-friendly trails', 'trail|hike|canyon|falls|lookout|mountain|forest|pathway'),
  @('park', 'Park', 'Parks', 'park')
)
function KindOf($s) {
  $head = ($s.summary -split ' with ')[0]
  foreach ($k in $KINDS) { if ($s.name -match $k[3]) { return $k } }
  foreach ($k in $KINDS) { if ($head -match $k[3]) { return $k } }
  return @('sight', 'Attraction', 'Attractions', '')
}
# 도시: area 에 도시 이름이 들어 있으면 그 도시, 없으면(동네 이름) 밴쿠버. 긴 이름부터 맞춰요 (Port Coquitlam > Coquitlam, North Vancouver > Vancouver)
$CITIES = 'Port Coquitlam', 'Port Moody', 'North Vancouver', 'West Vancouver', 'New Westminster', 'Pitt Meadows', 'Maple Ridge', 'White Rock', 'Abbotsford', 'Chilliwack', 'Coquitlam', 'Burnaby', 'Richmond', 'Surrey', 'Langley', 'Delta', 'Vancouver'
function CityOf($s) {
  foreach ($c in $CITIES) { if ($s.area -match [regex]::Escape($c)) { return $c } }
  return 'Vancouver'
}

# 불러오기
$raw = Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$all = if ($raw.spots) { $raw.spots } else { $raw }
$spots = foreach ($s in $all) {
  if ($s.venue -or $s.notKid -or $s.cat -notin 'nature', 'city') { continue }
  if (-not ($s.kids -or $s.family -or $s.play)) { continue }
  $k = KindOf $s
  $ks = @($k[0]); if ($k[0] -ne 'water' -and $s.summary -match '\ba (spray park|splash pad)|\bspray park in summer|\bsplash area') { $ks += 'water' }; if ($k[0] -ne 'play' -and $s.summary -match '\ba(n adventure)? playground') { $ks += 'play' }
  [pscustomobject]@{ kinds = $ks; id = $s.id; name = $s.name; area = $s.area; city = (CityOf $s); kind = $k[0]; kindOne = $k[1]; kindPlural = $k[2]; summary = $s.summary; price = $s.price; time = $s.time; env = $s.env; gem = [bool]$s.gem }
}
Write-Host "아이 동반 장소 $(@($spots).Count)곳"

# 종류별 안내용: 공원에 스프레이 파크·놀이터가 있으면 그 종류에도 한 번 더 넣어요 (spots 의 kinds)
$KP = @{}; foreach ($k in $KINDS) { if (-not $KP[$k[0]]) { $KP[$k[0]] = $k[2] } }
$rows = foreach ($s in $spots) { foreach ($kk in $s.kinds) { $c = $s.psobject.Copy(); $c.kind = $kk; $c.kindPlural = $KP[$kk]; $c } }

# 만들 페이지 정하기
$pages = New-Object System.Collections.ArrayList
foreach ($g in $rows | Group-Object kind, city) {
  $f = $g.Group[0]
  if ($g.Count -ge $MinKindCity -and $f.kind -notin 'sight') {
    [void]$pages.Add([pscustomobject]@{ slug = Slug "$($f.kindPlural) $($f.city)"; title = "$($f.kindPlural) in $($f.city) for kids"; h1 = "$($f.kindPlural) in $($f.city) for kids"; city = $f.city; kind = $f.kind; kindPlural = $f.kindPlural; spots = $g.Group })
  }
}
foreach ($g in $spots | Group-Object city) {
  if ($g.Count -ge $MinCity) { [void]$pages.Add([pscustomobject]@{ slug = Slug "places to take kids $($g.Name)"; title = "Places to take kids in $($g.Name): things to do with kids"; h1 = "Places to take kids in $($g.Name)"; city = $g.Name; kind = ''; kindPlural = ''; spots = $g.Group }) }
}
# 硫뷀듃濡?諛댁퓼踰??꾩껜: "places to take kids" 寃?됱슜. ?μ냼媛 ?덈Т 留롮븘??異붿쿇(gem) ?꾩＜ 30怨노쭔 ?ｊ퀬 ?꾩떆蹂??덈궡濡??댁뼱以섏슂
$gems = @($spots | Where-Object { $_.gem } | Select-Object -First 30)
if ($gems.Count -ge 6) { [void]$pages.Add([pscustomobject]@{ slug = 'places-to-take-kids-metro-vancouver'; title = 'Places to take kids in Metro Vancouver: top picks by city'; h1 = 'Places to take kids in Metro Vancouver'; city = ''; kind = ''; kindPlural = ''; spots = $gems }) }
foreach ($g in $rows | Group-Object kind) {
  $f = $g.Group[0]
  if ($g.Count -ge $MinKind -and $f.kind -notin 'sight') { [void]$pages.Add([pscustomobject]@{ slug = Slug "$($f.kindPlural) metro vancouver"; title = "$($f.kindPlural) for kids in Metro Vancouver"; h1 = "$($f.kindPlural) for kids in Metro Vancouver"; city = ''; kind = $f.kind; kindPlural = $f.kindPlural; spots = $g.Group }) }
}
# 같은 주소가 두 번 생기면(종류 하나뿐인 도시 등) 앞의 것만
$pages = @($pages | Group-Object slug | ForEach-Object { $_.Group[0] })
Write-Host "안내 페이지 $($pages.Count)개"

$css = @'
:root{--bg:#f7fafa;--fg:#14292b;--mut:#4a6366;--card:#fff;--line:#d5e3e4;--acc:#0f766e}
@media(prefers-color-scheme:dark){:root{--bg:#0e1b1c;--fg:#e4f1f1;--mut:#9db8ba;--card:#152729;--line:#27403f;--acc:#5eead4}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 48px}a{color:var(--acc)}
nav.top{font-size:14px;margin-bottom:12px}h1{font-size:26px;line-height:1.25;margin:4px 0 8px}p.lead{color:var(--mut);margin:0 0 20px}
.spot{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 12px}
.spot h2{font-size:18px;margin:0 0 2px}.spot .meta{color:var(--mut);font-size:14px;margin:0 0 6px}.spot p{margin:0 0 8px}
.cta{display:inline-block;background:var(--acc);color:var(--bg);font-weight:600;text-decoration:none;border-radius:8px;padding:8px 14px;font-size:14px}
.related{margin-top:28px;font-size:15px}.related ul{padding-left:18px}footer{margin-top:32px;color:var(--mut);font-size:13px}
'@

function Sub($text, $pattern, $value) { [regex]::Replace($text, $pattern, { param($m) $value }, 'Singleline') }
$shell = [IO.File]::ReadAllText((Join-Path $root 'index.html'), $enc)
function Plural($n, $w) { if ($n -eq 1) { "$n $w" } else { "$n ${w}s" } }
$guideDir = Join-Path $root 'guides'
if (Test-Path $guideDir) { Remove-Item $guideDir -Recurse -Force }
New-Item -ItemType Directory $guideDir | Out-Null

function Related($p) {
  $r = @()
  if ($p.city) { $r += $pages | Where-Object { $_.city -eq $p.city -and $_.slug -ne $p.slug } | Select-Object -First 8 }
  if ($p.kind) { $r += $pages | Where-Object { $_.kind -eq $p.kind -and $_.slug -ne $p.slug } | Select-Object -First 8 }
  $r | Group-Object slug | ForEach-Object { $_.Group[0] }
}

foreach ($p in $pages) {
  $list = @($p.spots | Sort-Object @{ e = { -not $_.gem } }, name)
  $n = $list.Count
  $free = @($list | Where-Object { $_.price -match '^free' }).Count
  $indoor = @($list | Where-Object { $_.env -eq 'indoor' }).Count
  $where = if ($p.city) { "in $($p.city)" } else { 'across Metro Vancouver' }
  $what = if ($p.kindPlural) { $p.kindPlural.ToLower() } else { 'places' }
  $bits = @()
  if ($free) { $bits += "$free free" }
  if ($indoor) { $bits += "$indoor indoor" }
  $lead = "$(Plural $n 'kid-friendly place') ${where}: $what picked for families with babies, toddlers and school-age kids." + $(if ($bits) { " $($bits -join ', ')." } else { '' }) + ' Open any spot in Tiny Trips for hours, parking and what parents say.'
  $desc = ($lead -replace '\s+', ' ')
  if ($desc.Length -gt 300) { $desc = $desc.Substring(0, 297) + '...' }
  $url = "$site/guides/$($p.slug)/"
  $items = for ($i = 0; $i -lt $n; $i++) { [ordered]@{ '@type' = 'ListItem'; position = $i + 1; name = $list[$i].name; url = "$site/#spot=$($list[$i].id)" } }
  $ld = ([ordered]@{ '@context' = 'https://schema.org'; '@type' = 'ItemList'; name = $p.h1; url = $url; numberOfItems = $n; itemListElement = @($items) } | ConvertTo-Json -Depth 5 -Compress) -replace '</', '<\/'
  # 방문자에게는 진짜 앱(index.html 껍데기)이 뜨고, 이 안내 글은 앱 아래쪽(#seo-static)에 남아요. 구글은 같은 글을 그대로 읽어요
  $L = 'underline text-teal-700 dark:text-teal-300'
  $sb = New-Object System.Text.StringBuilder
  foreach ($s in $list) {
    $meta = @($s.area, $(if ($s.price) { $s.price }), $(if ($s.time) { $s.time }), $(if ($s.env) { (Get-Culture).TextInfo.ToTitleCase($s.env) })) | Where-Object { $_ }
    [void]$sb.AppendLine("<div class=""rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3""><h2 class=""font-bold text-base text-slate-900 dark:text-slate-100"">$(Esc $s.name)</h2><p class=""text-xs mb-1"">$(Esc ($meta -join ' · '))</p><p class=""mb-2"">$(Esc $s.summary)</p><a class=""$L"" href=""/#spot=$(Esc $s.id)"">Hours, parking &amp; tips</a></div>")
  }
  $rel = Related $p
  $relHtml = if ($rel) { '<div class="mt-6"><strong>More guides</strong><ul class="list-disc pl-5 mt-1">' + (($rel | ForEach-Object { "<li><a class=""$L"" href=""/guides/$($_.slug)/"">$(Esc $_.h1)</a></li>" }) -join '') + '</ul></div>' } else { '' }
  $body = "<nav class=""mb-2""><a class=""$L"" href=""/"">Tiny Trips</a> › <a class=""$L"" href=""/guides/"">Guides</a></nav><h1 class=""font-brand text-2xl md:text-3xl font-extrabold mb-2 text-slate-900 dark:text-slate-100"">$(Esc $p.h1)</h1><p class=""mb-4"">$(Esc $lead)</p>" + $sb.ToString() + $relHtml + "<p class=""mt-6 text-xs"">Details change, so check the official site before you go.</p>"
  $body = "<details><summary class=""cursor-pointer select-none font-semibold text-slate-500 dark:text-slate-400"">About this guide: $(Esc $p.h1)</summary><div class=""mt-3"">" + $body + "</div></details>"
  $html = $shell
  $html = Sub $html '<title>[^<]*</title>' "<title>$(Esc $p.title) | Tiny Trips</title>"
  $html = Sub $html '<link rel="canonical" href="[^"]*">' "<link rel=""canonical"" href=""$url"">"
  $html = Sub $html '<meta name="description" content="[^"]*">' "<meta name=""description"" content=""$(Esc $desc)"">"
  $html = Sub $html '<meta property="og:title" content="[^"]*">' "<meta property=""og:title"" content=""$(Esc $p.title)"">"
  $html = Sub $html '<meta property="og:description" content="[^"]*">' "<meta property=""og:description"" content=""$(Esc $desc)"">"
  $html = Sub $html '<meta property="og:url" content="[^"]*">' "<meta property=""og:url"" content=""$url"">"
  $html = Sub $html '<meta name="twitter:title" content="[^"]*">' "<meta name=""twitter:title"" content=""$(Esc $p.title)"">"
  $html = Sub $html '<meta name="twitter:description" content="[^"]*">' "<meta name=""twitter:description"" content=""$(Esc $desc)"">"
  $html = Sub $html '<!--seo-start-->.*<!--seo-end-->' "<!--seo-start-->$body<!--seo-end-->"
  # 앱이 이 안내에 실린 장소만 보여주게 (메트로 전체 추천 모음은 일부만 실려서 제외)
  if ($p.city -or $p.kind) {
    $g = ([ordered]@{ title = $p.h1; ids = @($list | ForEach-Object { $_.id }) } | ConvertTo-Json -Compress) -replace '</', '<\/'
    $html = Sub $html '<script src="/app.js"></script>' "<script>window.GUIDE=$g</script><script src=""/app.js""></script>"
  }  $html = Sub $html '</head>' "<script type=""application/ld+json"">$ld</script>`n</head>"
  $dir = Join-Path $guideDir $p.slug
  New-Item -ItemType Directory $dir | Out-Null
  [IO.File]::WriteAllText((Join-Path $dir 'index.html'), $html, $enc)
}

# 예전 주소(things-to-do-with-kids-<도시>)로 들어와도 새 주소로 넘어가게 이동용 페이지를 만들어요 (GitHub Pages 는 서버 리다이렉트가 없어서)
foreach ($p in ($pages | Where-Object { $_.slug -like 'places-to-take-kids-*' })) {
  $old = $p.slug -replace '^places-to-take-kids-', 'things-to-do-with-kids-'
  $to = "$site/guides/$($p.slug)/"
  $stub = "<!doctype html><html lang=""en""><head><meta charset=""utf-8""><title>Moved: $(Esc $p.h1)</title><link rel=""canonical"" href=""$to""><meta http-equiv=""refresh"" content=""0; url=/guides/$($p.slug)/""><script>location.replace('/guides/$($p.slug)/' + location.hash)</script></head><body><p>This page moved to <a href=""/guides/$($p.slug)/"">$(Esc $p.h1)</a>.</p></body></html>"
  $d = Join-Path $guideDir $old
  New-Item -ItemType Directory $d -Force | Out-Null
  [IO.File]::WriteAllText((Join-Path $d 'index.html'), $stub, $enc)
}
# 안내 목록 페이지 (도시별로 묶어서)
$idx = New-Object System.Text.StringBuilder
foreach ($c in ($CITIES | Sort-Object)) {
  $cp = @($pages | Where-Object { $_.city -eq $c })
  if (-not $cp) { continue }
  [void]$idx.AppendLine("<h2>$(Esc $c)</h2><ul>" + (($cp | ForEach-Object { "<li><a href=""/guides/$($_.slug)/"">$(Esc $_.h1)</a> ($($_.spots.Count))</li>" }) -join '') + '</ul>')
}
$mp = @($pages | Where-Object { -not $_.city })
[void]$idx.AppendLine('<h2>Metro Vancouver</h2><ul>' + (($mp | ForEach-Object { "<li><a href=""/guides/$($_.slug)/"">$(Esc $_.h1)</a> ($($_.spots.Count))</li>" }) -join '') + '</ul>')
# 안내 목록도 진짜 앱을 보여주고, 도시·종류별 목록은 아래에 접어 둬요 (다른 안내 페이지와 같은 방식)
$L = 'underline text-teal-700 dark:text-teal-300'
$idxBody = ($idx.ToString()).Replace('<h2>', '<h2 class="font-bold mt-5 mb-1">').Replace('<ul>', '<ul class="list-disc pl-5 space-y-0.5">').Replace('<a href', "<a class=""$L"" href")
$idxBody = "<details><summary class=""cursor-pointer select-none font-semibold text-slate-500 dark:text-slate-400"">Places to take kids in Metro Vancouver: guides by city and kind</summary><div class=""mt-3""><h1 class=""font-brand text-2xl md:text-3xl font-extrabold mb-2 text-slate-900 dark:text-slate-100"">Places to take kids in Metro Vancouver</h1><p class=""mb-2"">Pick a city or a kind of place. Each guide lists the spots with a short description, and links to the Tiny Trips app for hours, parking and what parents say.</p>" + $idxBody + "</div></details>"
$idxDesc = 'Guides to playgrounds, spray parks, farms, museums and indoor play for kids in Metro Vancouver, Abbotsford and Chilliwack, by city and by kind.'
$idxTitle = 'Places to take kids in Metro Vancouver: guides by city and kind'
$idxHtml = $shell
$idxHtml = Sub $idxHtml '<title>[^<]*</title>' "<title>$idxTitle | Tiny Trips</title>"
$idxHtml = Sub $idxHtml '<link rel="canonical" href="[^"]*">' "<link rel=""canonical"" href=""$site/guides/"">"
$idxHtml = Sub $idxHtml '<meta name="description" content="[^"]*">' "<meta name=""description"" content=""$idxDesc"">"
$idxHtml = Sub $idxHtml '<meta property="og:url" content="[^"]*">' "<meta property=""og:url"" content=""$site/guides/"">"
$idxHtml = Sub $idxHtml '<!--seo-start-->.*<!--seo-end-->' "<!--seo-start-->$idxBody<!--seo-end-->"
[IO.File]::WriteAllText((Join-Path $guideDir 'index.html'), $idxHtml, $enc)

# 사이트맵
$sm = New-Object System.Text.StringBuilder
[void]$sm.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$sm.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
[void]$sm.AppendLine("  <url><loc>$site/</loc><changefreq>weekly</changefreq></url>")
[void]$sm.AppendLine("  <url><loc>$site/guides/</loc><lastmod>$today</lastmod><changefreq>weekly</changefreq></url>")
foreach ($p in ($pages | Sort-Object slug)) { [void]$sm.AppendLine("  <url><loc>$site/guides/$($p.slug)/</loc><lastmod>$today</lastmod><changefreq>weekly</changefreq></url>") }
[void]$sm.AppendLine('</urlset>')
[IO.File]::WriteAllText((Join-Path $root 'sitemap.xml'), $sm.ToString(), $enc)
Write-Host "끝: guides/ $($pages.Count + 1)쪽, sitemap.xml"
