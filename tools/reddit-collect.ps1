# Reddit 언급 수집: 밴쿠버 지역 서브레딧 최근 2주 글 중 "제목"에 스팟 이름이 들어간 글을 모아요
# 배율(평소 대비)은 계산하지 않아요. 언급이 드물어서, "왜 지금 핫한가"의 근거 링크로만 써요.
# 결과: data/reddit.json 의 mentions[스팟 id] = { n: 2주 동안 언급된 글 수, posts: [최근 글 최대 3개] }
#
# Reddit JSON API는 로그인 없이 막혀 있어서(403) 공개 RSS를 써요. 비로그인 한도가 약 1분에 1회라
# 페이지(100개 글)마다 65초씩 쉬어요. 2주치에 15분쯤 걸려요.
# 실행: powershell -File tools/reddit-collect.ps1   (끝나면 tools/validate-data.ps1 로 점검)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$UA = 'SpotMate/0.1 (https://github.com/jsp6forcode/spotmate)'
$SUBS = 'vancouver','askvan','NorthVancouver','burnaby','surrey','richmondbc','coquitlam','langley','newwestminster','VancouverFood'
$DAYS = 14; $GAP = 65; $MAX_PAGES = 30

$spots = (Get-Content (Join-Path $root 'data/spots.json') -Raw -Encoding UTF8 | ConvertFrom-Json).spots
$stop = (Get-Date).ToUniversalTime().AddDays(-$DAYS)

# 1) 새 글 RSS를 페이지 넘겨 가며 받기
$posts = @{}; $after = ''
for ($p = 1; $p -le $MAX_PAGES; $p++) {
  $url = "https://www.reddit.com/r/$($SUBS -join '+')/new.rss?limit=100" + $(if ($after) { "&after=$after" } else { '' })
  $xml = $null
  for ($try = 1; $try -le 4 -and -not $xml; $try++) {
    try { $xml = [xml](Invoke-WebRequest -Uri $url -UserAgent $UA -UseBasicParsing -TimeoutSec 60).Content }
    catch { Write-Warning "page $p try $try : $($_.Exception.Message) — ${GAP}초 쉬었다 다시 해요"; Start-Sleep -Seconds ($GAP + 10) }
  }
  if (-not $xml) { throw "Reddit RSS를 받지 못했어요 (page $p). 기존 data/reddit.json은 그대로 둬요." }
  $entries = @($xml.feed.entry)
  if (-not $entries.Count) { break }
  foreach ($e in $entries) {
    $id = [string]$e.id
    if (-not $id -or $posts.ContainsKey($id)) { continue }
    $posts[$id] = [pscustomobject]@{
      title = [System.Net.WebUtility]::HtmlDecode([string]$e.title)
      url   = [string]$e.link.href
      sub   = [string]$e.category.term
      date  = ([datetime]$e.updated).ToUniversalTime()
    }
  }
  $last = ([datetime]$entries[-1].updated).ToUniversalTime()
  $after = [string]$entries[-1].id
  Write-Host "page $p : $($entries.Count) posts, oldest $($last.ToString('yyyy-MM-dd HH:mm'))Z"
  if ($last -lt $stop) { break }
  Start-Sleep -Seconds $GAP
}
$recent = @($posts.Values | Where-Object { $_.date -ge $stop })
if ($recent.Count -lt 100) { throw "글이 너무 적어요 ($($recent.Count)개). 기존 data/reddit.json은 그대로 둬요." }

# 2) 제목에 스팟 이름이 (단어 단위로) 들어간 글만 매칭. 본문까지 보면 "분실물", "선거" 같은 무관한 글이 많이 섞여요
$mentions = [ordered]@{}
foreach ($s in $spots) {
  $name = ($s.name -replace '\s*\(.*?\)', '').Trim()
  if ($name.Length -lt 5) { continue }
  $re = '(?<![\w])' + [regex]::Escape($name) + '(?![\w])'
  $hits = @($recent | Where-Object { $_.title -match $re } | Sort-Object date -Descending)
  if ($hits.Count) {
    $mentions[$s.id] = [ordered]@{
      n = $hits.Count
      posts = @($hits | Select-Object -First 3 | ForEach-Object { [ordered]@{ title = $_.title; url = $_.url; sub = $_.sub; date = $_.date.ToString('yyyy-MM-dd') } })
    }
  }
}

$dates = $recent | Sort-Object date
$out = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
  from = $dates[0].date.ToString('yyyy-MM-dd'); to = $dates[-1].date.ToString('yyyy-MM-dd')
  source = "Reddit public RSS, newest posts in r/$($SUBS -join ', r/'). Only post titles that name a place are matched."
  posts = $recent.Count
  mentions = $mentions
}
$json = $out | ConvertTo-Json -Depth 6 -Compress
[IO.File]::WriteAllText((Join-Path $root 'data/reddit.json'), $json + "`n", (New-Object Text.UTF8Encoding $false))
Write-Host "끝: 글 $($recent.Count)개 ($($out.from) ~ $($out.to)), 언급된 스팟 $($mentions.Count)곳"
