# aulauniversitaria

A live course finder for **aulauniversitaria**, the over-50s learning programme run by Asociación Civil Promover with the Extension Office of Universidad Blas Pascal, Argüello, Córdoba, Argentina.

Built by a five-agent pipeline. Every course fact on the page is read from the coordination team's Google Sheet at the moment the page loads.

## The live data connection

There is no course data in this repository. Search the source for a course name and you will not find one.

`assets/app.js` requests this endpoint on every page load, with `cache: 'no-store'` and a changing query parameter so nothing can be served from a cache:

```
https://docs.google.com/spreadsheets/d/1L_NLVsq-tyLCxXYgrWA47xWoRZK0W2Xtq2deKFM-Zug/gviz/tq?tqx=out:json
```

The sheet is shared read-only by link, so there is **no API key anywhere in this repository**.

The footer prints the time the data was read. If that timestamp is not close to now, the fetch did not happen. If the sheet is unreachable the page shows an error and the phone number: it never falls back to a stored copy.

## Files

```
index.html                 the page
assets/styles.css          styling, light and dark
assets/app.js              live fetch, finder, week view, language toggle
assets/logo.jpg            the wordmark
pipeline/01-research-brief.md    Valentina Ocampo, Researcher
pipeline/02-design-spec.md       Tomás Iriarte, Designer
pipeline/03-messaging.md         Rubén Salvatierra, Communicator
pipeline/04-build-notes.md       Nadia Kaufman, Maker
pipeline/05-manager-gates.md     Delia Fontán, Manager
```

The agent personas themselves live in `../aulauniversitaria-agents/`.

## The pipeline

```
Valentina  >  Tomás  >  Nadia  >  Rubén
Researcher    Designer   Maker     Communicator
           reviewed at every join by Delia, Manager
```

| Handoff | Artefact | Outcome |
|---|---|---|
| Valentina to Tomás | Research brief: competitor audit of four Córdoba providers, three sized problems | Pass |
| Tomás to Nadia | Design specification, 31 numbered acceptance criteria | Pass |
| Nadia to Rubén | Working site, source, gap list | Returned once, then pass |
| Rubén to Delia | Message house, launch kit, channel plan | Pass |
| Delia | Gate decision, operating plan, risk register, compliance | Proceed |

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

## Known gaps

Course names and free-text notes render in English because the sheet stores them in English. The finder expands Spanish searches into English terms so "italiano" finds Italian I, but the real fix is a `course_name_es` column in the sheet, which this page will use automatically the moment it exists.

The full list is in `pipeline/04-build-notes.md`. Nothing is hidden in a code comment.

## Running it locally

```bash
python -m http.server 8899
```

Then open `http://localhost:8899`. The fetch needs http rather than `file://`.

## Privacy

The page collects nothing. No form, no account, no cookie, no analytics, no tracking script, no third-party embed.
