---
name: Tiny Trips
description: Big fun for little ones in Metro Vancouver
colors:
  inlet-teal: "#226277"
  inlet-teal-deep: "#1d5062"
  inlet-teal-bright: "#2c798f"
  inlet-teal-light: "#4793a8"
  inlet-teal-mist: "#d4e9ee"
  inlet-teal-wash: "#eef6f8"
  rain-sky: "#f4f6f5"
  wet-stone: "#e5eae9"
  cedar-border: "#ced7d6"
  moss-grey: "#5c6e6d"
  slate-ink: "#374645"
  forest-night: "#172120"
  night-floor: "#0d1514"
  white: "#ffffff"
  pin-park: "#2E8B3E"
  pin-trail-beach: "#D2B07A"
  pin-water: "#56B4E9"
  pin-museum-library: "#6A4C93"
  pin-shops: "#CC79A7"
  pin-indoor-rides: "#E69F00"
  pin-farm: "#7A4A1E"
  pin-arts: "#D55E00"
  pin-market: "#F0E442"
  pin-event: "#1f2328"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  card-title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "6px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.inlet-teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.inlet-teal-deep}"
  button-soft:
    backgroundColor: "{colors.wet-stone}"
    textColor: "{colors.forest-night}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.inlet-teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
  chip-removable:
    backgroundColor: "{colors.inlet-teal-mist}"
    textColor: "{colors.inlet-teal-deep}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    height: "32px"
  input-field:
    backgroundColor: "{colors.wet-stone}"
    textColor: "{colors.forest-night}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "44px"
  card-place:
    backgroundColor: "{colors.white}"
    textColor: "{colors.forest-night}"
    rounded: "{rounded.xl}"
  card-section:
    backgroundColor: "{colors.white}"
    textColor: "{colors.forest-night}"
    rounded: "{rounded.xl}"
    padding: "20px"
  map-pin:
    width: "30px"
    height: "38px"
---

# Design System: Tiny Trips

## Overview

**Creative North Star: "The Rainy-Day Field Guide"**

Tiny Trips should feel like a well-thumbed local field guide a Vancouver parent keeps in the car: sea-and-forest colours, plain facts in a steady order, and real photos doing the selling. The palette comes from the place itself: deep Burrard Inlet teal for anything you can act on, and the blue-grey of a wet sky and damp cedar for everything else. Colour that means something (map pins, category dots) is the only bright colour on the page.

Density is practical, not airy. A parent on a phone, one hand on a stroller, should be able to scan a card in a second: photo, name, today's hours, ages, distance. Corners are almost square on purpose (2–6px), a deliberate step away from the over-rounded, bubbly look; only circles (pins, dots, the heart, the back-to-top button) stay round. Bricolage Grotesque gives headings a friendly, slightly hand-made voice; IBM Plex Sans keeps facts plain and legible.

Light and dark themes are both first-class. Dark mode is a deep forest-night floor, not pure black, and map tiles are inverted to match.

**Key Characteristics:**
- Photo-led place cards on a pale rain-sky page
- One action colour: inlet teal
- Near-square corners; circles only for pins and dots
- Category colour is meaning, never decoration
- Soft neutral lift on cards and dialogs; everything else flat
- Phone-first, one-handed, glanceable

## Colors

A muted coastal palette: one deep teal accent over blue-grey neutrals, plus a colour-blind-safe category set reserved for map pins and type dots.

Implementation note: the Tailwind config in `index.html` remaps `violet-*` to the teal ramp and `slate-*` to the blue-grey ramp, so `violet-600` in code means inlet teal and `slate-*` means the rainy-sky greys.

### Primary
- **Inlet Teal** (`violet-600`): primary buttons, selected chips, links, the back-to-top button, theme colour. The colour of anything a parent can press.
- **Inlet Teal Deep** (`violet-700`): hover on primary buttons, link text in light mode, text on teal-mist chips.
- **Inlet Teal Bright** (`violet-500`): focus outlines, the linked-card border on the map view.
- **Inlet Teal Light** (`violet-400`/`300`): links and accents in dark mode.
- **Inlet Teal Mist / Wash** (`violet-100` / `violet-50`): soft chip backgrounds and tinted callouts.

### Neutral
- **Rain Sky** (`slate-50`): the light-mode page floor.
- **Wet Stone** (`slate-100`): input fields, soft buttons, unselected toggles.
- **Cedar Border** (`slate-200`): hairline borders on section cards and chips.
- **Moss Grey** (`slate-500`): secondary text: meta lines, captions, counts.
- **Slate Ink** (`slate-700`): dark-mode borders.
- **Forest Night** (`slate-900`): body text in light mode; card surface in dark mode.
- **Night Floor** (`slate-950`): the dark-mode page floor.

### Category (map pins and type dots)
Okabe-Ito-based, chosen for colour-blind users and for meaning: park = green, trail and beach = sand, pool and skating = water blue, museum and library = purple, shops = pink, indoor play and rides = orange, farm = brown, arts = vermilion, markets = yellow, events = near-black. Light pins carry dark icon ink (`#1f2328`); dark pins carry white. Each pin also has a unique white line icon, so colour is never the only cue.

### Named Rules
**The One Voice Rule.** Inlet teal is the only interactive colour. If it's teal, you can press it.

**The Meaning-Only Rule.** Category colours appear only on pins, type dots and category chips' dots. Never use them as decoration, section backgrounds or headings.

**The Shape-Backs-Colour Rule.** Any colour-coded mark also carries an icon or label; colour alone never carries meaning.

## Typography

**Display Font:** Bricolage Grotesque (with system-ui), weights 700 and 800 only
**Body Font:** IBM Plex Sans (with system-ui, -apple-system, Segoe UI), weights 400–700

**Character:** Bricolage is warm and a little quirky, which suits the brand name and headings; Plex is sober and highly legible, which suits hours, prices and ages.

### Hierarchy
- **Display** (800, 30px, tight tracking): the place window title and big page titles.
- **Headline** (800, 24px): the hero "Tiny Trips" title and section headings like "Events, markets & festivals".
- **Title** (800, 18px): every section heading inside the place window; all sections share this one style.
- **Card Title** (700, 15px, Bricolage): place and event names on cards; truncated or clamped to two lines.
- **Body** (400, 16px/24px): running text.
- **Body Small** (400, 14px, relaxed): descriptions, tips, meta lines in Moss Grey.
- **Label** (600, 12px): chips, badges, filter labels, counts.

### Named Rules
**The Two-Voice Rule.** Bricolage for names and headings, Plex for facts. Never set hours, prices or ages in Bricolage.

## Layout

A single centred column, max 1152px wide (`max-w-6xl`), with 16px side gutters on phones and 24px from 768px up. The home page stacks: photo hero with weather, sticky filter bar, category chip row, map, then a card grid. Cards are one column on phones and grow to a multi-column grid on wider screens; on the map view, the list snaps card rows under the map on touch devices.

Spacing follows Tailwind's 4px step: 8px inside chips, 16px card padding on phones and 20px from 640px up, 32px between major sections. Touch targets are at least 32px (chips) and 40–44px (buttons, inputs). Safe-area insets are respected at the top and bottom.

Breakpoints: 640px (`sm`) and 768px (`md`).

## Elevation & Depth

Soft lift on content, flat everywhere else. Place cards and dialogs float on wide, low-opacity neutral shadows tinted with the dark ink colour; hover deepens the shadow rather than moving the card. Section cards in the place window use a hairline border instead of a shadow. The photo hero uses an even Forest Night scrim (56–62%, Night Floor 62–76% in dark mode) so white text reads over the bright sky and water.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.07)`): place cards and empty-state panels.
- **Card hover** (`box-shadow: 0 2px 4px rgba(15,23,42,.06), 0 14px 32px rgba(15,23,42,.12)`): place card hover.
- **Pin** (`filter: drop-shadow(0 2px 3px rgba(0,0,0,.4))`): drop-shaped map pins; with the white outline it lifts pins off busy map tiles.

### Named Rules
**The Neutral Shadow Rule.** Shadows are neutral ink, never coloured. No glows, no coloured halos, no radial colour washes behind content.

## Shapes

Near-square: 2px for small elements, 3px for chips and badges, 4px for buttons and inputs, 6px for cards and dialogs. Tailwind's radius scale is remapped in `index.html` so `rounded-2xl`/`3xl` also resolve to 6px. Map pins are drops (rounded head, pointed tip). Full circles are reserved for category dots, the "+N" cluster pin, the favourite heart and the back-to-top button. Borders are 1px hairlines in Cedar Border (Slate Ink in dark mode).

**The Square-Corners Rule.** Nothing above 6px radius except true circles. Over-rounded corners read as generic.

## Components

### Buttons
Plain and firm.
- **Shape:** gently squared (4px).
- **Primary:** Inlet Teal fill, white semibold text, 8px × 16px padding, 40px minimum height.
- **Hover / Focus:** hover darkens to Inlet Teal Deep; focus shows a 2px Inlet Teal Bright outline offset 2px.
- **Soft:** Wet Stone fill with Forest Night text for secondary toggles ("Open now", "Indoor"); becomes Inlet Teal with white text when pressed.

### Chips
- **Filter / category chips:** 3px corners, white with a hairline border (or a translucent white over the map), a coloured category dot with its line icon on the left, and a muted count on the right. Selected = solid Inlet Teal with white text.
- **Removable query chips:** Teal Mist background, Teal Deep text, trailing ×.
- **Tags** (event types, news kinds, "For parents", "Few days only", "Today", season chips): one neutral style for all, a hairline Cedar Border with Moss Grey text and 3px corners (`TAG_NEUTRAL` / `TAG_PILL` in `app.js`). The text carries the meaning, not colour. The only coloured tags are product recalls (rose), because they are safety warnings.
- **Toggles** (Open now, Indoor, Events/Markets on the map, season chips): Wet Stone when off, solid Inlet Teal with white text when on.
- **Tags on fixed backgrounds:** a tag on a photo is solid white with Slate Ink text (`TAG_ON_PHOTO`). A tag in a Leaflet popup, which stays white in dark mode, always uses dark text (`PARENTS_BADGE_POPUP`). Neither takes `dark:` colours.
- **Event and market labels on photos:** near-black for events and yellow for markets, matching their map pins.

**The Quiet Tag Rule.** Tags never get their own colour. If a tag needs to stand out, it isn't a tag: it's a warning (rose) or a selection (teal).

### Cards / Containers
- **Place card:** 6px corners, white (Forest Night in dark mode), Card rest shadow, photo on top or left with no padding, then name, meta line and facts. Whole card is the tap target, with a visible focus ring.
- **Section card (place window):** 6px corners, white, hairline Cedar Border, 16–20px padding, Title-style heading, small Moss Grey footnote for sources.
- **Internal padding:** 16px on phones, 20px from 640px up.

### Inputs / Fields
- **Style:** Wet Stone fill, no border, 4px corners, 40px (phone) to 44px tall, 12px side padding.
- **Focus:** 2px Inlet Teal ring; no outline glow.

### Hero Photo
A real, recognisable Metro Vancouver outing, never generic stock: the Stanley Park seawall with the Lions Gate Bridge and North Shore mountains (bobanny, Wikimedia Commons, public domain). No identifiable faces and no company logos as the subject. The credit links to the Commons file page, and the same photo is the link-preview image. Hero text is full white, not faded: re-measure contrast at 375–1920px in both themes whenever the photo, crop or scrim changes.

### Navigation
Top tabs inside the hero (Explore, Events, Markets, Saved, About, Instagram): white text on a translucent Forest Night (25%) plate over the photo, the active tab a solid white pill with dark text. A sticky filter bar follows the hero. A round teal back-to-top button sits bottom right on long scrolls.

### Map Pin (signature)
A 30×38px drop marker in the category colour with a white outline, a soft neutral drop shadow and a white (or dark, for light colours) line icon in the head; the tip is the exact location. The drop shape is what separates our places from the base map's round shop and stop icons, which are dimmed (icons 45%, labels 75% opacity). Hovered or linked pins scale 1.3× from the tip. Numbered pins keep the drop shape with a white fill, teal outline and the number in the head. Events are near-black drops, markets yellow. The place window's small map uses the same drop. Clusters are white circles with a dark 2px border and a "+N" count, so they never look like a place.

**The Drop-Means-Ours Rule.** Only Tiny Trips places, events and markets use the drop shape. Base map icons stay round and dimmed.

## Do's and Don'ts

### Do:
- **Do** use Inlet Teal for every pressable thing and nothing else.
- **Do** keep corners at 2–6px; use full circles only for dots, clusters, the heart and back-to-top, and the drop shape only for our map pins.
- **Do** pair every category colour with its line icon or a text label.
- **Do** set names and headings in Bricolage Grotesque and facts in IBM Plex Sans.
- **Do** use the neutral Card rest / Card hover shadows for lift.
- **Do** design both light (Rain Sky floor) and dark (Night Floor) themes for every surface.
- **Do** keep touch targets at least 32px for chips and 40px for buttons and inputs.

### Don't:
- **Don't** use coloured glows, coloured shadows or radial colour washes as backgrounds.
- **Don't** round cards or buttons beyond 6px.
- **Don't** use category colours as decoration or section backgrounds.
- **Don't** introduce a second accent colour for actions.
- **Don't** set body facts (hours, prices, ages) in the display font.
- **Don't** use generic stock photos in the hero, or fade white hero text below full strength (the photo credit may be 95%).
- **Don't** use emoji as icons (events, weather, categories, headings, badges). Use the line icon set (`typeIcon`, `wxSvg`, `evDot` in `app.js`); text symbols like ★ for ratings and ✓ are fine.
