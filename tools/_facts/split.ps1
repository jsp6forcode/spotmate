$d = Get-Content data/spots.json -Raw -Encoding UTF8 | ConvertFrom-Json
$kid = $d.spots | Where-Object { $_.cat -in 'nature','city' -and -not $_.notKid -and ($_.kids -or $_.family -or $_.play) -and $_.price -and $_.price -ne 'Free' }
$rows = $kid | ForEach-Object { [pscustomobject]@{ id=$_.id; name=$_.name; area=$_.area; price=$_.price; priceEst=[bool]$_.priceEst; env=$_.env; summary=$_.summary } } | Sort-Object area, name
$n = 10; $size = [math]::Ceiling($rows.Count / $n)
for ($i = 0; $i -lt $n; $i++) {
  $chunk = $rows | Select-Object -Skip ($i*$size) -First $size
  ConvertTo-Json -InputObject @($chunk) -Depth 4 | Set-Content -Encoding UTF8 "tools/_facts/in-$($i+1).json"
}
"$($rows.Count) rows, $size per chunk"
