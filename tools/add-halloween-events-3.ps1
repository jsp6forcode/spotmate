# One-off: Coquitlam Centre Spooky Treat Stations (Oct 31, 2026), from the mall's own Instagram post. ASCII-only source.
$ErrorActionPreference = 'Stop'
$path = Join-Path (Split-Path -Parent $PSScriptRoot) 'data/events.json'
$enc = New-Object System.Text.UTF8Encoding($false)
$raw = [IO.File]::ReadAllText($path, $enc)
$nd = [char]::ConvertFromUtf32(0x2013)
$pumpkin = [char]::ConvertFromUtf32(0x1F383)
$e = @"
    { "id": "coquitlamcentre-spookytreats-2026", "type": "festival", "icon": "$pumpkin", "name": "Spooky Treat Stations at Coquitlam Centre", "area": "Coquitlam",
      "venue": "Coquitlam Centre, Level 1 and 2 (2929 Barnet Hwy)", "lat": 49.2798, "lng": -122.7986, "spotId": "coquitlamcentre",
      "schedule": { "from": "2026-10-31", "to": "2026-10-31", "start": "12:00", "end": "15:00", "hoursText": "12${nd}3pm. Free, costumed kids 12 and under" },
      "summary": "Costumed kids 12 and under pick up a Halloween treat at stations around the mall and can enter to win a Haunted Halloween Basket worth over `$300", "source": "https://www.instagram.com/coquitlamcentre/" }
"@
if ($raw.Contains('"coquitlamcentre-spookytreats-2026"')) { throw 'already added' }
$marker = [regex]::Match($raw, '\}\s*\r?\n\s*\r?\n\s*\]\s*\r?\n\}\s*$')
if (-not $marker.Success) { throw 'end of events array not found' }
$new = $raw.Substring(0, $marker.Index + 1) + ",`r`n" + $e.TrimEnd() + "`r`n`r`n  ]`r`n}`r`n"
[IO.File]::WriteAllText($path, $new, $enc)
$null = ConvertFrom-Json $new
'added 1'
