$fixes = Get-Content tools/_facts/fixes.json -Raw -Encoding UTF8 | ConvertFrom-Json
$path = Join-Path (Get-Location) 'data/spots.json'
$raw = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
$done = 0; $miss = @()
foreach ($f in $fixes) {
  $id = [regex]::Escape($f.id)
  $rx = [regex]('("id": "' + $id + '"(?:(?!"id": ")[\s\S])*?"price": ")[^"]*(",)( "priceEst": (?:true|false),)?')
  if ($rx.IsMatch($raw)) {
    $raw = $rx.Replace($raw, { param($m) $m.Groups[1].Value + $f.tier + $m.Groups[2].Value }, 1)
    $done++
  } else { $miss += $f.id }
}
[IO.File]::WriteAllText($path, $raw, (New-Object Text.UTF8Encoding $false))
"applied $done of $($fixes.Count); missing: $($miss -join ', ')"
