# One-off (2nd batch): more 2026 Halloween events confirmed on official or event-organizer pages. ASCII-only source; emoji and dashes are built from code points.
$ErrorActionPreference = 'Stop'
$path = Join-Path (Split-Path -Parent $PSScriptRoot) 'data/events.json'
$enc = New-Object System.Text.UTF8Encoding($false)
$raw = [IO.File]::ReadAllText($path, $enc)
$nd = [char]::ConvertFromUtf32(0x2013)
function Em($cp) { [char]::ConvertFromUtf32($cp) }
$ghost = Em 0x1F47B; $train = Em 0x1F682; $pumpkin = Em 0x1F383; $mic = Em 0x1F3A4; $bat = Em 0x1F987; $cow = Em 0x1F3AD
$entries = @(
  @"
    { "id": "surrey-hauntedbog-2026", "type": "seasonal", "icon": "$ghost", "name": "Secrets of the Haunted Bog at Guildford Town Centre", "area": "Surrey",
      "venue": "Guildford Town Centre (10355 152 St)", "lat": 49.1897, "lng": -122.8037, "spotId": "guildford",
      "schedule": { "from": "2026-10-09", "to": "2026-10-31", "hoursText": "Free. See the City of Surrey page for times. Bring a non-perishable item for the Surrey Food Bank" },
      "summary": "A free, family-friendly walk-through of an immersive haunted bog with low-light areas, haze and animatronics. Some parts may frighten children under five", "source": "https://www.surrey.ca/news-events/events/secrets-of-haunted-bog-guildford-town-centre" }
"@,
  @"
    { "id": "lansdowne-piratetrain-2026", "type": "seasonal", "icon": "$train", "name": "Hallowe'en Pirate Train at Lansdowne Centre", "area": "Richmond",
      "venue": "Lansdowne Centre, Kiosk Court (5300 No. 3 Rd)", "lat": 49.1755, "lng": -123.1325, "spotId": "lansdownecentre",
      "schedule": { "from": "2026-10-07", "to": "2026-11-01", "hoursText": "Wed${nd}Sun during mall hours (closed Mon and Tue). `$5 per ride or 6 rides for `$20. No booking needed" },
      "summary": "A little pirate-themed Halloween train rides through the mall's Kiosk Court. Pay by card or cash on site", "source": "https://lansdowne-centre.com/events/" }
"@,
  @"
    { "id": "capilano-kpopcandy-2026", "type": "festival", "icon": "$pumpkin", "name": "K-Pop Candy Hunters Trick-or-Treating at Capilano Mall", "area": "North Vancouver",
      "venue": "Capilano Mall (935 Marine Dr)", "lat": 49.3216, "lng": -123.1003, "spotId": "capilanomall",
      "schedule": { "from": "2026-10-31", "to": "2026-10-31", "start": "13:00", "end": "15:00", "hoursText": "1${nd}3pm. Free entry, treats while supplies last" },
      "summary": "Trick-or-treat at 50+ stores, meet K-pop-inspired characters, and enjoy a live DJ and glitter tattoos. Costumes encouraged", "source": "https://nomsmagazine.com/events/k-pop-candy-hunters/" }
"@,
  @"
    { "id": "coq-cabinetofcuriosities-2026", "type": "festival", "icon": "$bat", "name": "Cabinet of Curiosities: A Haunted Heritage House", "area": "Coquitlam",
      "venue": "Mackin House Museum (1116 Brunette Ave)", "lat": null, "lng": null, "spotId": null,
      "schedule": { "from": "2026-10-30", "to": "2026-10-30", "start": "17:00", "end": "20:00", "hoursText": "5${nd}8pm. Entry by donation, RSVP appreciated" },
      "summary": "A vintage doll collection and Halloween displays with snacks, drinks and crafts. Recommended for ages 12 and up", "source": "https://www.coquitlamheritage.ca/events/cabinet-of-curiosities-a-haunted-heritage-house" }
"@,
  @"
    { "id": "greendale-halloweenparade-2026", "type": "festival", "icon": "$cow", "name": "Halloween Parade at Greendale Acres", "area": "Chilliwack",
      "venue": "Greendale Acres (41905 Old Yale Rd)", "lat": 49.1313, "lng": -122.0645, "spotId": "greendaleacreschilliwack",
      "schedule": { "from": "2026-10-31", "to": "2026-10-31", "hoursText": "Final day of the fall season. See Greendale Acres for times" },
      "summary": "Kids in costume join a parade around the farm in a pre-Halloween trick-or-treating party. The farm train runs as the Boo Express this season", "source": "https://vancouversbestplaces.com/fraser-valley/chilliwack/chilliwack-corn-maze-pumpkin-patch/" }
"@,
  @"
    { "id": "mapleridge-alouettecemetery-2026", "type": "seasonal", "icon": "$ghost", "name": "Alouette Cemetery Halloween Display", "area": "Maple Ridge",
      "venue": "12795 227A St (front-yard display)", "lat": null, "lng": null, "spotId": null,
      "schedule": { "from": "2026-10-01", "to": "2026-10-31", "start": "18:00", "end": "22:00", "hoursText": "Lights and effects usually 6${nd}10pm. Free, donations support Katie's Place Animal Shelter" },
      "summary": "A free, family-friendly Halloween yard display of a graveyard, pumpkins and a haunted house", "source": "https://vancouversbestplaces.com/events-calendar/october/vancouver-halloween-events/maple-ridge-alouette-cemetery-halloween-attraction/" }
"@
)
foreach ($e in $entries) { if ($raw.Contains(([regex]::Match($e, '"id": "([^"]+)"').Groups[1].Value) + '"')) { throw 'already added' } }
$marker = [regex]::Match($raw, '\}\s*\r?\n\s*\r?\n\s*\]\s*\r?\n\}\s*$')
if (-not $marker.Success) { throw 'end of events array not found' }
$insert = ",`r`n" + (($entries | ForEach-Object { $_.TrimEnd() }) -join ",`r`n") + "`r`n"
$new = $raw.Substring(0, $marker.Index + 1) + $insert + "`r`n  ]`r`n}" + "`r`n"
[IO.File]::WriteAllText($path, $new, $enc)
$null = ConvertFrom-Json $new
"added $($entries.Count)"
