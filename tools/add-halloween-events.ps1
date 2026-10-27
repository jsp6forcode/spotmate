# One-off: adds the Halloween events (2026) that were confirmed on official or 2026 listings. ASCII-only source; emoji and dashes are built from code points.
$ErrorActionPreference = 'Stop'
$path = Join-Path (Split-Path -Parent $PSScriptRoot) 'data/events.json'
$enc = New-Object System.Text.UTF8Encoding($false)
$raw = [IO.File]::ReadAllText($path, $enc)
$nd = [char]::ConvertFromUtf32(0x2013)
function Em($cp) { [char]::ConvertFromUtf32($cp) }
$owl = Em 0x1F989; $pumpkin = Em 0x1F383; $ghost = Em 0x1F47B; $train = Em 0x1F682
$plane = (Em 0x2708) + (Em 0xFE0F)
$entries = @(
  @"
    { "id": "halloweenhoot-2026", "type": "seasonal", "icon": "$owl", "name": "Halloween Hoot at Richmond Nature Park", "area": "Richmond",
      "venue": "Richmond Nature Park (11851 Westminster Hwy)", "lat": 49.1735, "lng": -123.0972, "spotId": "richmondnature",
      "schedule": { "from": "2026-10-24", "to": "2026-11-01", "start": "10:00", "end": "16:00", "hoursText": "Daily 10am${nd}4pm. Admission by donation" },
      "summary": "A drop-in family Halloween event with a spooky decorated trail and pumpkins, plus the Nature House. Dress warmly", "source": "https://www.richmond.ca/culture/calendar/special-events/halloween.htm" }
"@,
  @"
    { "id": "kidsmarket-halloweenie-2026", "type": "festival", "icon": "$pumpkin", "name": "Halloweenie at the Granville Island Kids Market", "area": "Granville Island",
      "venue": "Kids Market (1496 Cartwright St)", "lat": 49.2703, "lng": -123.136, "spotId": "kidsmarket",
      "schedule": { "from": "2026-10-31", "to": "2026-10-31", "start": "11:00", "end": "16:00", "hoursText": "Trick-or-treating 11am${nd}1pm, free activities 11am${nd}4pm" },
      "summary": "Free trick-or-treating, face painting, a photo op and live music at the Kids Market", "source": "https://www.kidsmarket.ca" }
"@,
  @"
    { "id": "howlover-flyover-2026", "type": "seasonal", "icon": "$plane", "name": "HowlOver Canada at FlyOver", "area": "Waterfront",
      "venue": "Canada Place Pier (999 Canada Pl)", "lat": 49.2886, "lng": -123.1111, "spotId": "canadaplace",
      "schedule": { "from": "2026-10-15", "to": "2026-11-01", "hoursText": "Various times. Buy tickets online" },
      "summary": "A Halloween flight ride with a decorated pre-show where guests meet Biker Mama the Witch before flying through the night sky", "source": "https://dailyhive.com/vancouver/halloween-events-vancouver-2026" }
"@,
  @"
    { "id": "bearcreek-pumpkintrain-2026", "type": "seasonal", "icon": "$train", "name": "Pumpkin Train at Bear Creek Park", "area": "Surrey",
      "venue": "Bear Creek Park (13750 88 Ave)", "lat": 49.1591, "lng": -122.8401, "spotId": "bearcreek",
      "schedule": { "from": "2026-10-01", "to": "2026-10-31", "start": "10:00", "end": "17:00", "hoursText": "Daily 10am${nd}5pm. The night-time Scream Train (Oct 16${nd}Nov 1, 6${nd}10pm) is a scarier haunt" },
      "summary": "The miniature train runs through the park decorated for Halloween. The evening Scream Train is not for young kids", "source": "https://www.familyfuncanada.com/vancouver/pumpkin-train-at-bear-creek/" }
"@,
  @"
    { "id": "paradeoflostsouls-2026", "type": "festival", "icon": "$ghost", "name": "Parade of Lost Souls and Parade of Little Souls", "area": "East Vancouver",
      "venue": "Starts at Vernon Dr and Napier St (route announced after midnight on Oct 31)", "lat": null, "lng": null, "spotId": null,
      "schedule": { "from": "2026-10-31", "to": "2026-10-31", "start": "19:00", "end": "22:00", "hoursText": "7${nd}10pm. Free, donations welcome" },
      "summary": "A community lantern and costume parade with a family-friendly Parade of Little Souls and an after-party. This year's theme is Trickster's Treat", "source": "https://dailyhive.com/vancouver/halloween-events-vancouver-2026" }
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
