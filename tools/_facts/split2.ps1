$facts = Get-Content data/spot-facts.json -Raw -Encoding UTF8 | ConvertFrom-Json
$have = @{}; foreach ($p in $facts.spots.PSObject.Properties) { $have[$p.Name] = $true }
$prior = @{}
1..10 | ForEach-Object { $o = Get-Content "tools/_facts/out-$_.json" -Raw -Encoding UTF8 | ConvertFrom-Json; foreach ($p in $o.PSObject.Properties) { $prior[$p.Name] = $p.Value } }
$all = Get-Content tools/_facts/in-1.json, tools/_facts/in-2.json -Raw | Out-Null
$rows = @()
1..10 | ForEach-Object { $rows += (Get-Content "tools/_facts/in-$_.json" -Raw -Encoding UTF8 | ConvertFrom-Json) }
$todo = $rows | Where-Object { -not $have[$_.id] } | ForEach-Object {
  $pr = $prior[$_.id]
  [pscustomobject]@{ id=$_.id; name=$_.name; area=$_.area; price=$_.price; env=$_.env; summary=$_.summary; priorFound = if ($pr -and $pr.admission) { $pr.admission.text } else { $null }; priorNote = if ($pr -and $pr.amenities) { $pr.amenities.note } else { $null } }
} | Sort-Object area, name
$n = 5; $size = [math]::Ceiling($todo.Count / $n)
for ($i = 0; $i -lt $n; $i++) { ConvertTo-Json -InputObject @($todo | Select-Object -Skip ($i*$size) -First $size) -Depth 4 | Set-Content -Encoding UTF8 "tools/_facts/in2-$($i+1).json" }
"$($todo.Count) places, $size per chunk"
