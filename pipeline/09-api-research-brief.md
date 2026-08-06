# Research brief: public APIs worth connecting

**From:** Valentina Ocampo, Researcher
**To:** Tomás Iriarte, Designer
**Data pulled:** 6 August 2026. Every API below was called live on that date and the result checked, not read about.

---

## What I was asked

Find public API services worth connecting to the site or the assistant. Something genuinely useful, not a weather widget.

I have not designed anything. Three candidates follow, sized against our own data, plus two I tested and rejected. Tomás decides what, if anything, gets built.

---

## The test I applied

An API earns a place here only if it answers a question a real person asks us, that we cannot answer from our own sheets. That rules out most of the "nice demo" category immediately: a currency converter, a weather box, a quote of the day. None of them is why anyone visits this page.

I also required each one to be free, to need no key, and to work from a browser or our own function without a paid intermediary. An integration that needs a credential and a monthly bill is a liability for an organisation with no engineer.

---

## Finding 1. Public holidays. This is the one worth building.

**API:** `https://api.argentinadatos.com/v1/feriados/2026`
**Tested:** HTTP 200, 19 holidays returned for 2026, `Access-Control-Allow-Origin: *`, no key, no registration.

Our classes run weekly on fixed weekdays from 2 March to 30 November. Argentine public holidays land on those weekdays constantly, and when they do, the class does not happen.

I joined the holiday list against our live course sheet:

| Measure | Value |
|---|---|
| Holidays inside the teaching year that fall on a day we teach | **13** |
| Course sessions cancelled across the year as a result | **107** |

The worst days are the ones everybody forgets: Thursday 2 April and Thursday 9 July each take out **13 courses**, and each of the four Monday holidays takes out **11**.

Nothing on our site or in the assistant knows any of this today. A student looking at "Italiano I, jueves 15:00" has no way to learn that on 9 July there is no class. Every one of those 107 sessions is a potential phone call, or worse, someone travelling to Argüello for a closed classroom.

This is the rare case where a public API answers a question our own data cannot, for an audience that is disproportionately affected: the people most likely to make a wasted trip are the ones who do not drive.

*Caveat I have to record:* argentinadatos.com is a community project, not a government service. It has no uptime guarantee. Anything built on it needs to degrade to silence rather than to a wrong answer, and the national holiday calendar is published by decree well in advance, so a yearly manual check against the official list is cheap insurance. I would not let this API be the only source of truth for a date.

---

## Finding 2. Calendar export. Not an API, and better for it.

Not a service at all: **iCalendar (.ics)** is a file format, generated from data we already hold.

A student who picks a course could add its weekly slot to the phone calendar their family already helps them manage. It costs one small function, no third party, no key, no uptime risk, and no request leaves the browser.

Combined with finding 1, the exported calendar could simply omit the 13 holiday dates, which is the only place these two ideas need to meet.

I am including this in a brief about APIs because the honest answer to "which API should we add" is partly "this one does not need an API at all".

---

## Finding 3. Getting to Argüello. Real problem, no usable API.

The strongest unmet need after holidays is travel. Our campus is in Argüello, several courses sit at other venues (I count **6 distinct non-campus venues** in the sheet, including Driving Villa Allende, Bodegón Silvestre and Estancia La Granadilla), and a share of this audience does not drive.

I could not find a usable public API.

- **Municipalidad de Córdoba open data portal.** I read the full API list. It publishes neighbourhoods, CPC locations, open-data catalogues and dashboards. **There is no transit API**: no stops, no routes, no arrival times.
- **Córdoba GTFS.** The city does publish a GTFS feed, but it is a static file to download and parse, not a live service. Useful to someone building a journey planner, not to us.
- **Nominatim (OpenStreetMap geocoding).** Works, HTTP 200, but returns **no CORS header**, so it cannot be called from the browser. It would need a proxy through our own function, and its usage policy discourages exactly this kind of embedding.

**Recommendation: do not build this.** A static map image and a written "cómo llegar" answers the same question at a fraction of the cost. I would rather say that plainly than dress up a weak integration as a finding.

---

## Rejected, with reasons

| Candidate | Tested | Why not |
|---|---|---|
| **Open Library** (book covers and metadata) | HTTP 200, CORS `*` | Only **7 of 47** courses name a coursebook. It would decorate 15% of the catalogue and answer nobody's question |
| **Wikipedia REST** (author and movement summaries) | HTTP 200, CORS `*` | Only **2 of 47** courses name an author or movement in a way we could match reliably. Pretty, pointless |
| **BCRA** (inflation and exchange statistics) | **HTTP 410, endpoint retired** | Tempting because our fee "se ajusta durante el año", but this is an internal pricing question, and putting an inflation figure anywhere near a page that deliberately publishes no price is the worst idea in this document |
| **Weather** | not tested | Excluded by the brief, and correctly. Nobody chooses a philosophy course based on Thursday's forecast |

---

## What I could not establish

- **Whether holiday confusion actually generates calls.** I have sized the clash precisely, 13 dates and 107 sessions, but nobody records why people ring. My claim that this causes wasted journeys is **plausible, not measured**. It would be settled by asking coordination to tally the reason for the next fifty calls, which costs one sheet and no money.
- **How many of our students travel by bus.** No data. It is why finding 3 is a recommendation not to build rather than a recommendation to build something smaller.

---

## Sources

- ArgentinaDatos public holidays API, called live 6 August 2026
- Municipalidad de Córdoba open data API index, `gobiernoabierto.cordoba.gob.ar/apis`, read 6 August 2026
- Córdoba GTFS dataset listing, city open government portal
- Nominatim, Open Library and Wikipedia REST endpoints, each called live with CORS headers inspected
- BCRA statistics endpoint, returned HTTP 410 on 6 August 2026
- aulauniversitaria live course sheet, 47 rows, pulled 6 August 2026
