# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Parents and caregivers of kids aged 0–10 in Metro Vancouver, Abbotsford and Chilliwack. They are usually on a phone, often shortly before heading out, deciding where to take the kids today or this weekend. The job: pick a place that is open, suits the kids' ages and the weather, and won't hold surprises at the door.

## Product Purpose

Tiny Trips (tinytripsvan.ca; repo name SpotMate) helps parents find places to take kids near them: playgrounds, spray parks, indoor play, farms, museums, beaches, trails, rinks and more, with hours, prices, ages, weather and family events. Success means a parent finds a fitting place quickly, trusts what the site says, and comes back next weekend.

## Positioning

What Google Maps or a blog list can't truthfully offer together:

- **Verified kid places only.** Every place is checked as genuinely good for kids (kid words in reviews, official facts). Places that aren't for kids are left out entirely.
- **Right now, near me.** Open today, weather-aware (indoor options when it rains), this weekend's events.
- **Trustworthy details.** Accurate hours, prices, ages and real photos, so there are no surprises at arrival.
- **Local parent voice.** Reviews and tips from other Vancouver parents.

## Operating Context

- Home page with cards, filters, a map (Leaflet/MapLibre, color-blind-friendly pins), live Vancouver weather (Open-Meteo), events and "Good to know this month" news.
- Place window (modal) with a Before-you-go card, merged Price/Admission, and nearby places.
- Static SEO guide pages per category and city under `guides/` and `spots/`, generated from the shell (rerun `build-guides.ps1` after shell edits).
- Saved places and parent reviews behind Google sign-in (Firebase/Firestore).
- Instagram (@tinytripsvan) for social content; reels and social assets live in `reel/` and `social/`.
- Static site on GitHub Pages; app code lives in `app.js` (not `index.html`); data in `data/*.json`, validated by GitHub workflows.

## Capabilities and Constraints

- About 1,100 places in `data/spots.json`; the target is 50+ kid places per city.
- Kid places only. Food/dessert ("Eats") and "New Rising Spot" were removed; trends are off (`TRENDS_ON` false).
- Wineries count only with an official kid-friendly fact.
- No parking information anywhere.
- Cards never show "Hours unknown"; unknown hours show nothing.
- Wording: a listing is a **place**, never a "spot" ("spot" survives only in URLs, ids and everyday phrases like "reserve a spot"). The chip for places with an event or market in the next 7 days, or something in season, is **What's on**. **This weekend** means Saturday and Sunday only; a rolling week is **Next 7 days**. The Events tab is titled **Events**, not "for families", because it includes marked sales for parents.
- The place window must not repeat text; new sections go through `dd.fresh()`.
- Photos must match the description: a real Commons photo first, otherwise labelled Pexels stock varied by place kind, otherwise an illustration. Sumo Dino keeps its claw-machine photo.
- News covers this month's official news only, travel and getting around first.
- AI search and per-card AI exist in code but stay switched off until the site grows.

## Brand Commitments

- Name: **Tiny Trips**, tagline "Big fun for little ones in Metro Vancouver".
- Voice: warm, plain and brief, like a neighbour parent. Short sentences, no hype.
- Existing favicon, apple-touch icon and Instagram handle.

## Evidence on Hand

- Place data, facts, guides, parent notes and events in `data/` (`spots.json`, `spot-facts.json`, `spot-guides.json`, `parent-says.json`, `events.json`, `news.json`).
- Real parent reviews come only from signed-in users. Never fabricate reviews, testimonials, ratings, visitor counts or press.

## Product Principles

1. Trust before breadth: a wrong hour or a non-kid place costs more than a missing one.
2. Answer "where can we go right now?" first: open today, near me, right for today's weather.
3. Every place earns its spot for kids 0–10, with evidence.
4. Say it once, plainly: no repeated text, no filler, no blank "unknown" labels.
5. Phone first, for a parent with a kid in tow.

## Accessibility & Inclusion

Map pins use color-blind-friendly colors that carry meaning; light and dark themes are supported. Readable at a glance on a phone, one-handed.
