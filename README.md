# aulauniversitaria

A live course finder and assistant for **aulauniversitaria**, the over-50s learning programme run by Asociación Civil Promover with the Extension Office of Universidad Blas Pascal, Argüello, Córdoba, Argentina.

Built by a five-agent pipeline across five runs. Every course, teacher and information fact on the page is read from the coordination team's Google Sheets at the moment it is used.

| | |
|---|---|
| Live site | https://andresapitt.github.io/ceai-c3/ |
| Assistant API | https://ceai-c3.vercel.app/api/chat |
| Agent personas | `../aulauniversitaria-agents/` |
| Evidence screenshots | `../evidence-screenshots/` |

## The live data connection

There is no course data in this repository. Search the source for a course name and you will not find one.

Four Google Sheets and one public API are read at the moment they are used, never bundled and never cached:

| Source | Read by | Holds |
|---|---|---|
| `1LN4OD7dwwSkjaJGJJknTKnxD3B2a71bdr5ktWFrZJtM` | the page **and** the assistant | 47 courses |
| `1lVxincu--PI9M_WPri5c1gdf4A8f2ezIWWbrn4wexwA` | the page | 28 teachers and their biographies |
| `1x4Gf8OEYduZuh1lofeh_xxXeGVrlWZEie4FVHcDFnE4` | the page | the practical information cards |
| `FAQ_SHEET_ID` (Vercel env) | the assistant | 35 curated answers |
| `api.argentinadatos.com/v1/feriados/` | the page **and** the assistant | Argentine public holidays |

Each sheet is read through the gviz endpoint, with `cache: 'no-store'` and a changing query parameter so nothing can be served from a cache:

```
https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:json&headers=1
```

`headers=1` is not optional. gviz decides whether row 1 is a header by comparing column *types*, so a sheet that is entirely text gets no header detected, every field reads `undefined`, and nothing visibly fails. That is what happened to the FAQ sheet on 6 August.

The sheets are shared read-only by link, so there is **no API key anywhere in this repository**.

The footer prints the time the data was read. If that timestamp is not close to now, the fetch did not happen. If a sheet is unreachable the page shows an error and the phone number: it never falls back to a stored copy.

## Files

```
index.html                       the page
assets/styles.css                styling, light and dark
assets/app.js                    live sheet reads, finder, week view, teachers,
                                 info cards, holidays, calendar export, language
assets/chat.js                   the assistant panel, cards, dictation
assets/chat.css                  the assistant panel styling
assets/logo.jpg                  the wordmark
api/chat.js                      Vercel serverless function, Google Gemini
```

Pipeline artefacts, one per handoff, each opening with `From`, `In`, `To` and `Gate`:

```
Run 1, the website
  pipeline/01-research-brief.md        Valentina Ocampo, Researcher
  pipeline/02-design-spec.md           Tomás Iriarte, Designer
  pipeline/03-messaging.md             Rubén Salvatierra, Communicator
  pipeline/04-build-notes.md           Nadia Kaufman, Maker
  pipeline/05-manager-gates.md         Delia Fontán, Manager

Run 2, the assistant
  pipeline/06-chatbot-design-spec.md   Tomás
  pipeline/07-chatbot-build-notes.md   Nadia
  pipeline/08-chatbot-gates.md         Delia

Run 3, public APIs
  pipeline/09-api-research-brief.md    Valentina

Run 4, dictation
  pipeline/10-voice-design-spec.md     Tomás
  pipeline/11-voice-disclosure-copy.md Rubén
  pipeline/12-voice-build-notes.md     Nadia
  pipeline/13-voice-gate.md            Delia

Run 5, compact results
  pipeline/14-compact-card-spec.md     Tomás, with Nadia's note back
```

The agent personas themselves live in `../aulauniversitaria-agents/`.

## The pipeline

```
Valentina  >  Tomás  >  Nadia  >  Rubén
Researcher    Designer   Maker     Communicator
           reviewed at every join by Delia, Manager
```

**Run 1, the website.**

| Handoff | Artefact | Outcome |
|---|---|---|
| Valentina to Tomás | Research brief: competitor audit of four Córdoba providers, three sized problems | Pass |
| Tomás to Nadia | Design specification, 31 numbered acceptance criteria | Pass |
| Nadia to Rubén | Working site, source, gap list | Returned once, then pass |
| Rubén to Delia | Message house, launch kit, channel plan | Pass |
| Delia | Gate decision, operating plan, risk register, compliance | Proceed |

**Run 2, the assistant.** Delia inverted the order to Rubén, then Tomás, then Nadia, reasoning that a chatbot with no curated knowledge is a model improvising about an organisation. Rubén's 35 FAQ answers existed before anything was designed. Valentina did not work on this run, and Delia declined to spend her time to make the diagram symmetrical.

**Run 3.** Valentina tested six public APIs live, recommended one, and recommended against the second most appealing.

**Runs 4 and 5** follow Run 1's order. Delia's gate on dictation records one condition and one refusal.

The handoff that was **returned**: Nadia's first gap list omitted that course names render in English, which Rubén needed before writing Spanish copy.

## What the research found

No competitor in Córdoba publishes a timetable. PUAM lists a price and no schedule. Comenzar lists neither. UPAMI and the Universidad Provincial are free but publish nothing about days or teachers.

aulauniversitaria is the only one of the four offering a free trial class, and that offer was buried in a document almost nobody reads. It is now the first line on the page.

## Accessibility

Measured in a browser, not assumed.

| Target | Result |
|---|---|
| Base font size | 20px |
| Body contrast | 9.48:1 |
| Heading contrast | 18.42:1 |
| Primary button contrast | 7.14:1 |
| Touch targets under 48px | 1, a provenance link in the footer |
| Missing form labels | 0 |
| Images without alt text | 0 |

No carousel, no hover-only interaction, no timed content. Light and dark schemes at the same standard.

Two places sit at 44 to 46px rather than 48px, both deliberate and both at the floor rather than below it: the header controls between 761px and 1220px wide, and the enquiry link on a compact course card. Nothing in the interface goes under 44px.

## Header layout

The brand, five nav links and four tools share one row down to 1121px. Below that the nav takes its own row, with the brand and tools together above it.

That breakpoint is set by Spanish, not English: its labels are longer, and squeezing them onto one line at 1000px would mean shrinking type past what this audience should have to read. A decided two-row layout beats an accidental one, which is what flex wrapping gives you when nobody has chosen anything.

With the A+ text-size control on, the header wraps again at narrower widths. That is the right trade: the alternative is shrinking targets for the people who have just asked for larger text.

## Spanish course names

Any column in the sheet may have an `_es` twin. When the page is in Spanish and the twin has a value, it wins. When it does not, the English column shows rather than nothing.

Two are supported today: `course_name_es` and `notes_es`. Adding more needs no code change.

`programas/courses-2026-ES.csv` carries both, with titles taken from the original Spanish programme document rather than translated back from the English. Upload it to the sheet and the page renders in Spanish on the next load.

Day, area, format, level and period are translated in the page itself, so they need no columns.

## The assistant

Live at `/api/chat`, on Vercel, using Google Gemini.

It re-reads two Google Sheets and the holidays API on every message: the 47-course catalogue, 35 curated FAQ answers, and the public holidays that fall on a teaching day. Nothing is bundled or cached. It discloses that it is not a person in its first sentence, asks for no personal data, stores nothing, and cannot state a fee.

Deployment check:

```
GET /api/chat?selftest=1
```

Reports key presence, the configured model, the models the key can actually reach, and for each sheet the row count, the detected column names and whether the FAQ is usable. It never returns the key.

Environment variables, set in Vercel and never in this repository:

| Name | Purpose |
|---|---|
| `GEMINI_API_KEY` | Required |
| `FAQ_SHEET_ID` | Required for the FAQ knowledge |
| `GEMINI_MODEL` | Optional, defaults to `gemini-2.5-flash` |

**Rate limiting.** 10 requests a minute and 50 an hour per visitor, 150 a minute overall, in memory with salted-hash IP keys. Best effort rather than exact, and `pipeline/07-chatbot-build-notes.md` says why.

**The fee rule** is enforced in three independent layers written by three agents who did not coordinate on it: Rubén's FAQ answer, Tomás's criterion 3, and a regex in `api/chat.js` tested against 24 cases. If a fee amount ever reaches the response, the answer is replaced rather than shown.

### Course cards

When an answer concerns specific courses, the model ends its message with a line of ids, `[[CURSOS: C030, C031]]`. The server looks each id up in the sheet it just read and builds the card from those values, so **nothing on a card is the model's wording**. An id that is not in the sheet is dropped silently rather than rendered as an empty card. The list is capped at eight.

At five cards or more the card switches to a compact form: name, day and time, format, category and the enquiry link, with a count above the list. Below five it shows the teacher, level, period and capacity too. The reasoning is in `pipeline/14-compact-card-spec.md`: at two or three results someone is deciding, at eight they are scanning.

The panel scrolls to the top of the reply once an answer lands, not to the bottom of the last card.

### Dictation

A microphone button beside the input, using the browser's `SpeechRecognition` API. Built to nine criteria in `pipeline/10-voice-design-spec.md`.

There is **no `MediaRecorder` in this codebase and no audio upload**. The browser transcribes and returns a string; the audio never reaches this site or the Vercel function. That is why the privacy line names Google and Apple rather than us.

| Behaviour | Why |
|---|---|
| Dictated text lands in the input and is never sent automatically | Speech recognition gets proper nouns wrong, and this catalogue is full of them |
| The button does not exist where the API does not | Firefox has never shipped it. A control that does nothing is worse than no control |
| Dictation appends to what was already typed | Wiping it is a small betrayal that stops people trying again |
| Closing the panel calls `abort()` | A hidden panel with an open microphone is not a feature with a bug in it |
| Language follows the page: `es-AR` or `en-GB` | Regional Spanish handles *vos* and *che* measurably better |

Four failure paths, four different sentences, every one ending in "or type your question".

Verified with 45 assertions against an injected fake recogniser. **Real speech is untested**, and that is the outstanding condition in `pipeline/13-voice-gate.md`.

## Teachers

A second sheet, read the same way as the first, configured in `assets/app.js`:

```js
var TEACHERS_SHEET_ID = '1lVxincu--PI9M_WPri5c1gdf4A8f2ezIWWbrn4wexwA';
```

If that is emptied, or if the sheet cannot be read, the teachers section **and its nav link** stay hidden. Hiding the section but leaving the link was a real defect, caught by the blocked-sheet test: it pointed at nothing. A missing biography is left blank rather than filled in: six people in the 2026 programme have no bio in any source.

Columns: `id, name, teaches_es, teaches_en, bio_es, bio_en, photo_url, active, sort_order`.

**Two teacher counts appear on the page and they do not match. Both are correct.** The hero counts distinct names in the `teacher` column of the *courses* sheet, currently 27, so it answers "how many people are teaching in 2026". The teachers section renders every active row of the *teachers* sheet, currently 28. A row can exist without a 2026 course. Six of the 28 have no biography in any source and are shown with the field blank rather than something invented.

`name` must match the `teacher` column in the courses sheet exactly. That join is what gives each card its workshop count and its "see their workshops" button. Set `active` to `no` to hide someone without deleting their row. `photo_url` is optional: without it the card shows the person's initials.

## Practical information

A third sheet, `INFO_SHEET_ID` in `assets/app.js`, holding the cards under "How to start". Six rows, columns `id, title_es, title_en, body_es, body_en, sort_order`.

It exists so coordination can change what the site says about enrolling, the term dates or how to reach Argüello without anyone touching code. Same failure behaviour as the others: unreachable means the section does not render, not that a stale copy is shown.

## Public holidays

`https://api.argentinadatos.com/v1/feriados/<year>`, free, no key, CORS open. Chosen by Valentina in `pipeline/09-api-research-brief.md` over five alternatives she tested and rejected.

Joined against the live course sheet, **13 holidays in 2026 fall on a day we teach, cancelling 107 course sessions.** The page shows the next three above the finder, each with the number of workshops affected. The same list goes into the assistant's context on every message, with a rule that it may list dates and confirm a date is a holiday, but may not tell anyone there *is* a class on a date it cannot verify.

Valentina recorded a caveat with the recommendation: this is a community project with no uptime guarantee, so anything built on it must degrade to silence rather than to a wrong answer. That was tested by killing the API before `app.js` runs. No notice, empty container, no console error, and the 47 courses, 28 teachers, 6 info cards and week view all still render. Evidence: `../evidence-screenshots/17-failstate-holidays-api-down.png`.

The holiday calendar is published by decree well in advance, so a yearly manual check against the official list is cheap insurance. Nobody owns that yet.

## Calendar export

Each course card offers two ways to take the same event away: straight into Google Calendar, or an `.ics` file every other calendar app opens. Both are built from one calculation, so they cannot disagree about when a class is.

The `.ics` is built in the browser from data the page already holds. No API, no server, no key. National holidays that fall on that course's weekday become `EXDATE` lines, so nobody gets a reminder for a class that is not running.

Offered only for courses the sheet describes as a real weekly slot. Fixed-date, one-off and fortnightly courses get no buttons rather than an invented series. The three courses with two alternative slots get a labelled pair each, because Monday 4pm or Tuesday 9am is a choice, not two classes.

**A difference worth knowing.** The `.ics` carries a real `EXDATE`, so holiday dates are removed from the series outright and no calendar app will remind anyone about them. Google's template URL takes the same exclusions, but its handling of them is undocumented and it may drop them. So the skipped dates are also written into the event description in plain words. If Google honours the exclusions the reader gets both; if it ignores them, the reader still sees which dates have no class. The download is the stronger of the two.

### duration_min

A plain whole number of **minutes**, in a `duration_min` column on the courses sheet.

| Write | Meaning |
|---|---|
| `120` | two hours |
| `90` | an hour and a half |
| `60` | one hour |
| *(blank)* | falls back to two hours, and the file says "duración aproximada" |

Format the column as **plain text or number, not Duration**. Sheets' own Duration format sends `02:00`, and `2 horas` is a natural thing to type: both would once have produced a two-minute class. The parser now accepts minutes, `H:MM` and `H:MM:SS`, and rejects anything outside 20 to 480 minutes, falling back to the labelled default instead.

## Hosting

The site runs on two hosts from one codebase.

| Host | Serves | Assistant |
|---|---|---|
| **Vercel** | the page and `/api/chat` | its own function |
| **GitHub Pages** | the page only | calls the Vercel function cross-origin |

GitHub Pages cannot run a serverless function, so a static-only deploy would leave the assistant permanently in its offline state. Instead `assets/chat.js` detects that it is on `github.io` and calls the Vercel endpoint, which allows that origin by name. Everything else, the four sheets and the holidays API, is read directly from the browser and works identically on both.

### GitHub Pages settings

Source must be **Deploy from a branch, `main`, `/ (root)`**. Pointing it at `/docs` fails the build, because there is no `docs` folder:

```
Error: No such file or directory @ dir_chdir0 - /github/workspace/docs
```

`.nojekyll` at the repo root stops Pages running Jekyll over the site. Nothing here needs it: the files are already the finished thing, and a Jekyll pass only adds a build that can fail.

## Running it locally

```bash
python -m http.server 8899
```

Then open `http://localhost:8899`. The fetch needs http rather than `file://`, and dictation needs a secure context, which localhost counts as.

The sheets, the holidays API and dictation all work from a plain static server. The assistant does not: `/api/chat` needs the serverless function. `api/chat.js` allows localhost origins by name, so pointing `ENDPOINT` in `assets/chat.js` at the deployed Vercel URL gives a working assistant locally.

## Known gaps

Per-run build notes carry their own gap lists: `pipeline/04-`, `07-` and `12-build-notes.md`. Nothing is hidden in a code comment.

Three items have no named owner, which Delia records as the real risk on this project rather than any single feature: social posting and phone coverage, the yearly holiday check against the official decree list, and the dictation device test.

The most useful thing in this repository for understanding how it was actually built is the defect log in `../REFLECTION-TIMELINE.md`. Twenty defects, dated, with how each one was found. Five of them were found only by looking at a screenshot while every automated check reported healthy.

## Theme

Light is the default for everyone. The operating system's dark-mode preference is deliberately not consulted, because the organisation chose white.

Dark is available behind the moon button in the header. The choice is remembered in `localStorage` under `au-theme` so the visitor does not have to make it again, and it never leaves the browser.

## Privacy

The page collects nothing and sends nothing anywhere. No form, no account, no analytics, no tracking script, no third-party embed.

One value is written to `localStorage`: `au-theme`, holding the word `light` or `dark`. It is a display preference, it is not personal data, and it is never transmitted.

Chat messages are sent to Google Gemini to generate a reply. The conversation lives in a variable and dies when the tab closes.

Dictation adds a second processor that is neither us nor Gemini: the browser's own speech service, Google on Chrome and Apple on Safari. The audio leaves the device but never reaches this site or the Vercel function, which only ever receive text. The panel says so in both languages, and browsers that cannot dictate are shown the shorter original line instead, because explaining a feature that is not on the screen is noise rather than transparency.

Teacher biographies are personal data. They are controlled by coordination in a sheet they can edit or empty at any time, and `active: no` hides someone without deleting their row.

The regulatory position, GDPR Art. 6(1)(f) and Art. 13, EU AI Act Art. 50(1), Annex III point 3 and Art. 5(1)(b), and Ley 25.326, is set out in `pipeline/08-chatbot-gates.md` and `pipeline/13-voice-gate.md`.
