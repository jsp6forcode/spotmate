# Google Places API 사용 횟수 기록 (사용자 규칙 2026-11-28: Places API 를 쓸 때마다 몇 번 썼는지 세기)
#   Google 을 부르는 도구(kids-check, kid-words, places-discover, refresh-reviews)가 이 파일을 불러서
#   끝날 때 Add-GoogleUsage 로 SKU 별 호출 수를 data/google-api-usage.json 에 더하고, 이번 달 합계를 무료 한도와 같이 보여줘요.
#   호출 수(숫자)만 저장해요. 평점·리뷰 같은 Google 내용은 저장하지 않아요.
#   이번 달 합계 보기만:  powershell -ExecutionPolicy Bypass -File tools\google-usage.ps1
#   2026-11-28 부터 세기 시작했어요. 그 전 사용량은 Cloud Billing → Reports (SKU 별)에서 보세요.

$script:GU_CAPS = [ordered]@{
  'Place Details Pro'                       = 5000
  'Place Details Enterprise'                = 1000
  'Place Details Enterprise + Atmosphere'   = 1000
  'Text Search Pro'                         = 5000
  'Text Search Enterprise'                  = 1000
  'Text Search Enterprise + Atmosphere'     = 1000
}
$script:GU_PATH = Join-Path (Split-Path $PSScriptRoot -Parent) 'data/google-api-usage.json'

function ConvertTo-GUHash($o) {
  $h = [ordered]@{}
  if ($o) { foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = $p.Value } }
  $h
}

function Read-GoogleUsage {
  $d = $null
  if (Test-Path $script:GU_PATH) { $d = Get-Content $script:GU_PATH -Raw -Encoding UTF8 | ConvertFrom-Json }
  $months = [ordered]@{}
  if ($d -and $d.months) { foreach ($m in $d.months.PSObject.Properties) { $months[$m.Name] = ConvertTo-GUHash $m.Value } }
  $runs = New-Object System.Collections.ArrayList
  if ($d -and $d.runs) { foreach ($r in $d.runs) { [void]$runs.Add([ordered]@{ at = $r.at; tool = $r.tool; calls = (ConvertTo-GUHash $r.calls) }) } }
  @{ months = $months; runs = $runs }
}

function Show-GoogleUsage([string]$Month = (Get-Date).ToString('yyyy-MM')) {
  $u = Read-GoogleUsage
  $m = $u.months[$Month]
  "Google Places API 이번 달($Month) 누적 (2026-11-28부터 기록):"
  if (-not $m -or $m.Count -eq 0) { "  아직 기록 없음"; return }
  foreach ($k in $m.Keys) {
    $cap = $script:GU_CAPS[$k]
    $warn = if ($cap -and $m[$k] -gt $cap) { '  <- 무료 한도 넘음!' } elseif ($cap -and $m[$k] -gt $cap * 0.8) { '  <- 한도 80% 넘음' } else { '' }
    "  {0}: {1} / {2} 무료{3}" -f $k, $m[$k], $(if ($cap) { $cap } else { '?' }), $warn
  }
}

# 사용: Add-GoogleUsage -Tool 'kids-check' -Calls @{ 'Place Details Enterprise + Atmosphere' = 3; 'Text Search Enterprise + Atmosphere' = 1 }
function Add-GoogleUsage([string]$Tool, [hashtable]$Calls) {
  $clean = [ordered]@{}; foreach ($k in $Calls.Keys) { if ([int]$Calls[$k] -gt 0) { $clean[$k] = [int]$Calls[$k] } }
  $total = 0; foreach ($v in $clean.Values) { $total += $v }
  "이번 실행 Google API 호출: $total 회" + $(if ($total) { ' (' + (($clean.Keys | ForEach-Object { "$_ $($clean[$_])" }) -join ', ') + ')' } else { '' })
  if ($total -eq 0) { Show-GoogleUsage; return }
  $u = Read-GoogleUsage
  $month = (Get-Date).ToString('yyyy-MM')
  if (-not $u.months.Contains($month)) { $u.months[$month] = [ordered]@{} }
  foreach ($k in $clean.Keys) { $u.months[$month][$k] = [int]$u.months[$month][$k] + $clean[$k] }
  [void]$u.runs.Add([ordered]@{ at = (Get-Date).ToString('yyyy-MM-dd HH:mm'); tool = $Tool; calls = $clean })
  while ($u.runs.Count -gt 200) { $u.runs.RemoveAt(0) }
  $out = [ordered]@{
    note     = 'Google Places API call counts per SKU (numbers only, no Google content). Written by tools/google-usage.ps1. Counting started 2026-11-28; earlier usage is in Cloud Billing.'
    freeCaps = $script:GU_CAPS
    months   = $u.months
    runs     = @($u.runs)
  }
  [IO.File]::WriteAllText($script:GU_PATH, ($out | ConvertTo-Json -Depth 6) + "`n", (New-Object Text.UTF8Encoding $false))
  Show-GoogleUsage $month
}

# 직접 실행하면 이번 달 합계만 보여줘요
if ($MyInvocation.InvocationName -ne '.') { Show-GoogleUsage }
