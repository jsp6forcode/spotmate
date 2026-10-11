$all = @{}
# 1李?out-N)? 2李?out2-N)瑜??⑹퀜?? 媛숈? ?μ냼???좊ː?꾧? ???믪? 履?媛숈쑝硫?2李????⑥슂
$rank = @{ high = 3; medium = 2; low = 1 }
$files = @(1..10 | ForEach-Object { "tools/_facts/out-$_.json" }) + @(1..5 | ForEach-Object { "tools/_facts/out2-$_.json" })
foreach ($p in $files) {
  if (-not (Test-Path $p)) { continue }
  $o = Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($prop in $o.PSObject.Properties) {
    $cur = $all[$prop.Name]
    if (-not $cur -or $rank[[string]$prop.Value.confidence] -ge $rank[[string]$cur.confidence]) { $all[$prop.Name] = $prop.Value }
  }
}
"entries: $($all.Count)"
$conf = $all.GetEnumerator() | Group-Object { $_.Value.confidence } | ForEach-Object { "$($_.Name)=$($_.Count)" }
"confidence: $($conf -join ', ')"
$withText = ($all.GetEnumerator() | Where-Object { $_.Value.admission -and $_.Value.admission.text }).Count
"with admission text: $withText"
$fx = ($all.GetEnumerator() | Where-Object { $_.Value.priceFix }).Count
"priceFix: $fx"
$am = ($all.GetEnumerator() | Where-Object { $a=$_.Value.amenities; $a -and ($a.stroller -or $a.changing -ne $null -or $a.nursing -ne $null) }).Count
"with amenity facts: $am"
$fo = ($all.GetEnumerator() | Where-Object { $f=$_.Value.food; $f -and ($f.onsite -or $f.outside -or $f.nearby) }).Count
"with food facts: $fo"

# ---- 2) 화면용 spot-facts.json: 신뢰도 high·medium만, 값이 없는 칸은 빼요
$keep = [ordered]@{}
$fixes = @()
$ids = $all.Keys | Sort-Object
foreach ($id in $ids) {
  $e = $all[$id]
  if ($e.confidence -notin 'high','medium') { continue }
  if ($e.status -in 'closed','not-found') { continue }
  $o = [ordered]@{}
  if ($e.admission -and $e.admission.text -and $e.admission.text -notmatch '3\.70|2023|3\.95|7\.93') {
    $a = [ordered]@{ text = $e.admission.text }
    if ($e.admission.booking) { $a.booking = $e.admission.booking }
    if ($e.admission.bookingNote) { $a.bookingNote = $e.admission.bookingNote }
    if ($e.admission.source -and $e.admission.source -match '^https://') { $a.source = $e.admission.source }
    $o.admission = $a
  } elseif ($e.admission -and $e.admission.booking) {
    $o.admission = [ordered]@{ booking = $e.admission.booking; bookingNote = $e.admission.bookingNote }
  }
  if ($e.amenities) {
    $m = [ordered]@{}
    foreach ($k in 'stroller','changing','nursing','washrooms','stairs','note') { if ($null -ne $e.amenities.$k) { $m[$k] = $e.amenities.$k } }
    if ($m.Count) { $o.amenities = $m }
  }
  if ($e.food) {
    $f = [ordered]@{}
    foreach ($k in 'onsite','outside','nearby') { if ($null -ne $e.food.$k) { $f[$k] = $e.food.$k } }
    if ($f.Count) { $o.food = $f }
  }
  if ($o.Count) { $o.checked = '2026-10-03'; $keep[$id] = $o }
  if ($e.priceFix) { $fixes += [pscustomobject]@{ id = $id; tier = $e.priceFix.tier; reason = $e.priceFix.reason; conf = $e.confidence } }
}
$out = [ordered]@{ updatedAt = '2026-10-03'; note = 'Verified from official or published sources; blank means not verified. Prices change, so check the source.'; spots = $keep }
$json = $out | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path (Get-Location) 'data/spot-facts.json'), $json, (New-Object Text.UTF8Encoding $false))
"spot-facts entries: $($keep.Count)"
$fixes | Format-Table -AutoSize | Out-String -Width 250
$fixes | ConvertTo-Json | Set-Content -Encoding UTF8 tools/_facts/fixes.json


