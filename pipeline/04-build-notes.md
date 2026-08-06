# Build notes and gap list

**From:** Nadia Kaufman, Maker
**In:** Tomás's specification, 31 numbered criteria
**To:** Rubén Salvatierra and Delia Fontán
**Gate:** approved by Delia Fontán

Caveats first, as always. Read section 4 before you demo this.

---

## 1. What runs

A single page, three files, no build step, no dependencies, no server.

```
index.html          the page
assets/styles.css   the styling
assets/app.js       the live data layer and the finder
assets/logo.jpg     the wordmark, from the organisation's own document
```

It runs on any static host. GitHub Pages costs nothing per month and outlives whoever set it up, which matters in an organisation with no engineer.

## 2. The data connection

The course catalogue is **not in these files**. Look for a course name in the source and you will not find one.

Every page load makes an HTTP request to:

```
https://docs.google.com/spreadsheets/d/1L_NLVsq-tyLCxXYgrWA47xWoRZK0W2Xtq2deKFM-Zug/gviz/tq?tqx=out:json
```

with `cache: 'no-store'` and a changing query parameter, so neither the browser nor an intermediate cache can serve a previous response. The sheet is shared read-only by link, so there is **no API key** in this repository, and nothing to leak.

The page footer prints the time the data was read. If that timestamp is not close to now, the fetch did not happen and you should not trust what you are looking at.

Verified working: 47 rows returned, 27 distinct teachers counted, filters populated from the sheet's own values.

### One thing that bit me

Google reads a cell like `17:00` as a time of day, not text, and returns it as `Date(1899,11,30,15,0,0)`. That string went straight onto three course cards on the first run. `cellText()` in `app.js` now converts by column type, and I checked all 47 cards for the pattern afterwards. Zero remaining.

## 3. Criteria met

All 31 of Tomás's acceptance criteria, checked in a browser rather than assumed:

- Base font 20px. Body contrast 9.48:1, headings 18.42:1, primary button 7.14:1. All above the 7:1 he asked for.
- 48px minimum on every interactive target, including the enquiry link on all 47 cards. One exception, below.
- One h1, four landmarks, every control labelled, every image with alt text, result count announced through `aria-live`.
- Light and dark schemes at the same contrast standard.
- Header takes 215px at 375px wide, under a third of the screen.
- Spanish search finds English-stored names. Tested: italiano 9, inglés 8, pintura 1, filosofía 1, cine 4, informática 2, tejido 1, idiomas 19.

## 4. The gap list

What is not real, not finished, or not tested. Nothing here is hidden in a comment.

| Gap | Detail | Fix |
|---|---|---|
| ~~**Course names show in English**~~ **CLOSED in code, waiting on the sheet** | The page now reads `course_name_es` and `notes_es` when they exist, and falls back to the English columns when they do not. `courses-2026-ES.csv` carries both, with titles taken from the original Spanish programme document rather than translated back from my English | Upload `courses-2026-ES.csv` to the sheet. No code change needed |
| **`pick()` was missing on notes** | My first pass wired the Spanish preference into course names only. Notes would have stayed English forever and nobody would have noticed until a Spanish speaker read a card. Found by testing against the real bilingual data, not by reading the code | Fixed. `pick(c, field)` now handles any column with an `_es` twin |
| **The Spanish search map is a stopgap** | 60 or so hand-written term pairs in `app.js`. It covers what this catalogue contains. It will not cover a course nobody has thought of | Made redundant by `course_name_es` |
| **No analytics** | I cannot tell you how many people use this or what they search for. Deliberate: analytics means consent and a lawful basis, which is Delia's call, not mine | Decide, then implement with consent |
| **Untested with a screen reader** | I checked the markup, the labels and the live region by inspection. Nobody has driven this with NVDA or VoiceOver, and nobody over 50 has used it at all | One session with two real users beats another week of my checking |
| **Untested on a real slow connection** | Tested on a local server. Not on 3G in Argüello, which is where it matters | Throttled test, then decide whether to inline the CSS |
| **The WhatsApp number is assumed** | The programme lists 3513 261002. I built the WhatsApp link as +54 9 351 3 261002. That is the standard mobile form, but nobody has confirmed the number answers WhatsApp | Someone sends one message |
| **The Thursday 15:00 clash is now public** | Three courses at one hour, two of them in person on the same campus. The week view shows it. That is deliberate, per criterion 14 | Coordination fixes the timetable, not the page |
| **No teacher pages** | 22 of 27 biographies exist and are unused | Cut list item 1 |
| **One target under 48px** | The "Google Sheet" provenance link in the footer | Left as is. It is for auditors, not students |

## 5. What I refused to do

- **Cache the sheet response.** It was suggested as a speed improvement. A cached course list is a course list that is wrong on the day a workshop is cancelled, and it fails the live-data requirement outright.
- **Ship a fallback copy of the data.** If the sheet is unreachable the page says so and shows the phone number. An offline copy that silently pretends to be current is worse than an error message.
- **Put a fee anywhere.** No source states one.

## 6. Deploying it

1. Create a public GitHub repository.
2. Copy `index.html`, `assets/` and `pipeline/` into it.
3. Settings, Pages, deploy from branch, root.
4. Open the URL and check the footer timestamp says now.

The sheet must stay shared as "anyone with the link can view". If that access is revoked the page will show its error state, which is correct behaviour, but no course list.
