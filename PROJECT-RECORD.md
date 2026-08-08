# Project record: aulauniversitaria agentic organisation

Source material for the H9CEAI final report. Everything here is drawn from the actual work: commit history, live API responses, and test output. Figures were re-verified against the live sheets on 6 August 2026.

**Live prototype:** https://ceai-c3.vercel.app
**Repository:** https://github.com/andresapitt/ceai-c3

---

## 0. How to use this, and one boundary

Sections below map onto the six required parts of the submission. Word budgets from the brief are noted so you can see how much of each section you actually need.

**On the Reflection (300 words):** the brief says it must be in your own words and not AI-generated. I have deliberately not written it. §13 gives you the raw facts, the decision points and the questions to answer, so you have material to think with. The prose has to be yours.

---

## 1. Your Organisation (~200 words in the report)

**aulauniversitaria** is a self-funded programme of activities for people over 50, run by **Asociación Civil Promover** with the Extension Office of **Universidad Blas Pascal**, on the UBP campus at Avda. Donato Álvarez 380, Argüello, Córdoba, Argentina.

| Fact | Value |
|---|---|
| Course offerings, 2026 first semester | 47 (38 regular courses + 9 new short workshops) |
| Distinct teachers | 27 named on courses, 28 rows in the teacher sheet |
| Format split | 40 in person, 7 online |
| Term | 2 March to 30 November 2026 |
| Funding | Student fees only |
| Minimum class size | 10 students |
| Certification | UBP certificate at 80% attendance |
| Conversion offer | One free trial class in any workshop |
| Published fee | **None, in any source** |

**The business challenge:** the programme is healthy and almost invisible. Nothing true about it was reachable at the moment a prospective student went looking. The public course page had been advertising the *second semester of 2021* for five years.

**Why an agentic approach fits:** the problem is not one task, it is a chain — find out what is actually wrong, decide what to build, build it, say why it matters, and decide whether the organisation can carry it. Each stage needs a different kind of judgement, and the failure mode of doing it as one undifferentiated task is exactly what happened to the real website: plausible work that nobody stopped to check against reality.

---

## 2. Agent Designs (~500 words in the report)

Five agents, each a full persona file (~2,000 words) built to a shared template. Files: `aulauniversitaria-agents/01`–`05`.

| Agent | Archetype | Domain | Produces |
|---|---|---|---|
| **Valentina Ocampo** | Researcher | Market and programme intelligence for lifelong learning | Research briefs with sized, evidenced problems |
| **Tomás Iriarte** | Designer | Service design, accessibility for over-50s | Numbered, testable design specifications |
| **Nadia Kaufman** | Maker | Front-end and live data integration | Working prototypes plus an honest gap list |
| **Rubén Salvatierra** | Communicator | Community marketing, over-50 audiences | Messaging, FAQ knowledge, go-to-market |
| **Delia Fontán** | Manager | Non-profit operations, governance | Gate decisions, operating plans, compliance |

### How they were made distinct

The common failure in a five-agent project is one voice at five settings. Three mechanisms prevented it:

**1. Each has a different fear.** This drives their beliefs, boundaries and behaviour:

| Agent | Fears |
|---|---|
| Valentina | An uncounted claim |
| Tomás | An unnecessary form field |
| Nadia | A hardcoded array |
| Rubén | A patronising headline |
| Delia | Excellent work nobody can staff |

**2. Each opening question is one only that agent would ask:**

- Valentina: *"What do you already believe is going wrong here, and what would it cost you to be wrong about it?"*
- Tomás: *"Walk me through what a 68-year-old has to do today to get into her first class, step by step, including the phone call."*
- Nadia: *"Where does the data live right now, and can I read it from a browser without a password?"*
- Rubén: *"Who told the last five people who enrolled about this programme, and what exactly did they say?"*
- Delia: *"If this works exactly as you hope, who is doing the extra work in March, and for how many hours a week?"*

**3. Domain-specific refusals, not generic AI-safety boilerplate.** Every agent has an "I won't" list tied to this organisation. The one they all share: **no agent will state a fee**, because the organisation publishes none. That single rule is enforced in three independent places in the running system (§9).

### Personas: honesty constraints

Each file states plainly that the agent is an AI colleague, not a human, and that its "experience" is a designed composite. Names were checked against all 27 real teachers to avoid impersonating anyone.

### House style

Both spec files impose the same writing rules: no em dashes, no semicolons, a banned-word list (*however, moreover, leverage, ensure, robust, seamless…*), active voice, concrete numbers. All five files were verified automatically against those rules before delivery.

---

## 3. The Pipeline in Action (~300 words + evidence)

**The pipeline ran three times, in different orders.** That variation is itself evidence of orchestration rather than a fixed script.

### Run 1 — the website

```
Valentina → Tomás → Nadia → Rubén        gated by Delia at every join
Research    Design   Build   Messaging
```

| Handoff | Artefact | Verdict |
|---|---|---|
| Valentina → Tomás | Research brief: 4-provider competitor audit, 3 sized problems | Pass |
| Tomás → Nadia | Design spec, **31 numbered acceptance criteria** | Pass |
| Nadia → Rubén | Working site, source, gap list | **Returned once** |
| Rubén → Delia | Message house, launch kit, channel plan | Pass |

**Why the return:** Nadia's gap list was honest about eight things but missed the ninth — that course names render in English. Rubén would have written Spanish copy around English course titles without knowing. Delia caught it at the join, which is the entire purpose of reviewing a handoff rather than only the end product.

### Run 2 — the assistant

**Delia deliberately reversed the order.**

```
Rubén → Tomás → Nadia                    gated by Delia
FAQ     Design   Build
```

Her reasoning, recorded in `pipeline/08`: *"A chatbot with no curated knowledge is a model improvising about an organisation."* Rubén's 35 FAQ answers became the knowledge base **before** anything was designed. Valentina did not work on this run — no new research was needed, and Delia declined to spend her time to make the diagram symmetrical.

### Run 3 — the public API research

```
Valentina → Tomás → Nadia
Research    Design   Build
```

Triggered by a request to find useful public APIs. Valentina tested five candidates live, recommended one, and recommended *against* building the second-most-appealing one.

---

## 4. What each agent found

### Valentina (Researcher) — competitor audit

Four organisations in Córdoba serve people over 50. She read all four public sites and called each API live.

| Provider | Price published | Timetable published | Teachers named | Filter/search |
|---|---|---|---|---|
| **PUAM** (UNC) | Yes — $15.000/month + $10.000 registration | No | No | No |
| **Comenzar** (UCC) | No | No | No | No |
| **UPAMI** (UNC+PAMI) | Free | No | No | No |
| **Univ. Provincial** | Free | No | No | No |
| **aulauniversitaria** | No | **Now yes** | **Now yes** | **Now yes** |

**Three findings that shaped everything:**

1. **Two competitors are free.** Price is not the argument.
2. **Nobody in the category publishes a timetable.** The single largest gap — and the one thing aulauniversitaria already had, sitting in a spreadsheet.
3. **Only aulauniversitaria offers a free trial class.** Buried in a paragraph of a document almost no prospective student opens.

**Own-site audit:**

| What a visitor saw | What was true |
|---|---|
| "Oferta Académica 2º Cuatrimestre 2021" | First semester 2026 |
| Julia Liliana Rizzi, Pablo Ravera teaching | Neither teaches on the 2026 programme |
| "Classes are virtual until in-person resumes" (COVID-era) | 40 of 47 offerings are in person |
| No course list, schedule or teacher roster | 47 offerings, 27 teachers |

Only **2 of 4** teachers named on the site still teach there.

### Valentina — public API research (Run 3)

Every candidate called live, then sized against the organisation's own data.

| Candidate | Result | Decision |
|---|---|---|
| **ArgentinaDatos public holidays** | HTTP 200, CORS `*`, no key | **BUILD** |
| iCalendar export | Not an API at all | Build (separately) |
| Córdoba transit | **No transit API exists**; GTFS is a static file; Nominatim sends no CORS header | **Do not build** |
| Open Library | HTTP 200 | Reject — matches 7 of 47 courses |
| Wikipedia REST | HTTP 200 | Reject — matches 2 of 47 courses |
| BCRA inflation | **HTTP 410, retired** | Reject — and an inflation figure near a page with no published price is a bad idea regardless |

**The holidays finding, quantified by joining the API against the live course sheet:**

| Measure | Value |
|---|---|
| Holidays inside the term falling on a teaching day | **13** |
| Course sessions cancelled across the year | **107** |
| Worst days | Thu 2 April and Thu 9 July — **13 courses each** |
| Four Monday holidays | **11 courses each** |

**Her caveat, recorded rather than buried:** argentinadatos.com is a community project with no uptime guarantee. Anything built on it must degrade to silence rather than to a wrong answer.

**What she could not establish:** whether holiday confusion actually generates phone calls. She sized the clash precisely but marked the "causes wasted journeys" claim **plausible, not measured** — settled by asking coordination to tally the reason for the next fifty calls.

### Tomás (Designer)

**Website spec — 31 numbered acceptance criteria.** He rejected two concepts before choosing:

| Concept | Decision |
|---|---|
| A. Brochure site with a PDF catalogue | Rejected — "reproduces the current failure in a newer font" |
| B. Course finder on the live sheet | **Chosen** |
| C. Finder + online enrolment and payment | Rejected — no engineer, no named owner |

**Assistant spec — 23 criteria**, including the four suggested questions. He deliberately put *"¿Cuánto cuesta?"* first: the question the assistant is least able to answer, so the visitor meets the honest limitation in ten seconds from a button rather than after typing a paragraph.

**Argued with himself in writing.** His own belief says a large-text mode means the default is wrong. He specified an A+ control anyway, and explained why: the default is already 20px, so the control is a bonus rather than a compensation.

### Nadia (Maker)

Built everything, and refused three things: caching sheet data, faking a live connection, and committing a secret. Her build notes carry a gap list that names what is stubbed or untested rather than hiding it.

### Rubén (Communicator)

**Core message:** *"Elegí un taller. La primera clase es gratis."*

His reasoning: in a market with two free competitors, price is not the argument. The trial class answers the real objection, which is not "how much" but "will I feel out of place".

**What he changed:**

| Was | Became | Why |
|---|---|---|
| "Programa para adultos mayores de 50 años" | "Elegí un taller. La primera clase es gratis." | Age is a targeting parameter, not a headline |
| "Formación integral y crecimiento personal" | "Idiomas, arte, filosofía, tecnología, bridge y golf" | Nouns describe what you will do on Wednesday |
| "Consultar aranceles" | Names the payment mechanism, then the phone number | Dodging the price question reads as hiding something |
| "Contactanos" | "WhatsApp 351 3 261002" as a button | An abstraction became an action |

**What he refused to write:** a price or range, a testimonial (none exist on record), fear copy about cognitive decline, false scarcity on classes that need students, and any claim to be the largest or best.

**He also stated the cost of honesty plainly:** not publishing a fee will lose enquiries to the two free competitors. He wrote that down rather than writing around it.

**35 FAQ answers**, bilingual, 8 categories, 7 flagged for human escalation — verified to contain zero money amounts.

### Delia (Manager)

**Gate decisions:** proceed on the website; proceed on the assistant with two conditions; proceed on holidays; do not build transit; stop online enrolment before design work started.

**Two overrules of Tomás:**
1. He wanted the assistant to open by asking a question. She required it to **disclose it is not a person first**, before any input.
2. She required the fee question first among the suggestions.

**One stop:** online enrolment and payment, killed before design. *"A plan that adds work without naming who does it is not a plan."*

**A standing condition she added mid-project**, after the FAQ failure: *"No integration is signed off on a status endpoint alone. Someone asks it real questions and reads the answers."*

---

## 5. Chronological log of requests and changes

| # | Request | What changed |
|---|---|---|
| 1 | Translate the programme document | 30-page English DOCX + PDF from a legacy `.doc` |
| 2 | Create a context MD | 819-line structured knowledge base, ~12k tokens |
| 3 | Check their website for additions | Found the site 5 years stale; added org background, Instagram, UBP phones |
| 4 | Convert courses to CSV | 47 rows × 20 columns, UTF-8 BOM |
| 5 | Read template, create 5 agents | 5 personas + team spec + README |
| 6 | Build the website | Live course finder, week view, 3-step path |
| 7 | Create Spanish spreadsheet | `course_name_es` + `notes_es`, titles from the original Spanish document |
| 8 | New sheet URL | Repointed; found the `pick()` bug |
| 9 | Build a chatbot (Vercel + Gemini) | Serverless function, widget, 35-entry FAQ |
| 10 | Model + key configured | Verified `gemini-3.5-flash-lite`; found the FAQ header bug |
| 11 | Prefer white, dark as an option | Light default + persisted toggle; found the `[hidden]` bug |
| 12 | Show courses as cards in chat | Model returns IDs; server fills cards from the sheet |
| 13 | Add rate limiting | 10/min, 50/hr per visitor; hashed IP |
| 14 | Teachers section from a sheet | 28 teachers, 22 bios, joined to courses by name |
| 15 | Prove the data is live | 4 verification tests; found 2 more bugs |
| 16 | Info section from a sheet | 6 cards, bilingual |
| 17 | Research useful public APIs | 6 candidates tested live, 1 recommended |
| 18 | Build the holidays integration | Page notice + assistant knowledge + calendar exclusions |
| 19 | How would calendar export work? | Analysis before building: 40 of 47 exportable |
| 20 | Build it | `.ics` with holiday exclusions |
| 21 | `duration_min` format? | Hardened the parser first — found the `02:00` hazard |
| 22 | Column added | All 40 use real durations |
| 23 | Split into two buttons | Google Calendar + `.ics` |
| 24 | Button does nothing | Popup blocker; converted to an anchor |
| 25 | Pages build failing | `.nojekyll` + cross-origin API |
| 26 | Default to English | English default, Spanish toggle |
| 27 | Add Instagram | Header, contact, footer; corrected the handle |

---

## 6. Technical architecture

```
Browser (page)                      Vercel serverless (/api/chat)
  ├── courses sheet    (live)         ├── courses sheet   (live, every message)
  ├── teachers sheet   (live)         ├── FAQ sheet       (live, every message)
  ├── info sheet       (live)         ├── holidays API    (live, every message)
  ├── holidays API     (live)         └── Google Gemini   (gemini-3.5-flash-lite)
  └── .ics generated in-browser
```

**Four live Google Sheets, read through the gviz JSON endpoint, no API key:**

| Sheet | Rows | Columns | Feeds |
|---|---|---|---|
| Courses | 47 | 23 | Finder, week view, chat cards, calendar |
| Teachers | 28 | 9 | Teachers section |
| FAQ | 35 | 9 | Assistant knowledge |
| Info | 6 | 7 | "Lo que conviene saber" |

**One public API:** ArgentinaDatos public holidays — free, no key, CORS open.

**Codebase:** 2,852 lines across 6 source files. No framework, no build step, no dependencies.

**Hosting:** Vercel (page + function). GitHub Pages serves the same code and calls the Vercel API cross-origin, with the origin allowlisted by name rather than by wildcard.

**Secrets:** `GEMINI_API_KEY` in Vercel environment only. Verified absent from the repository.

---

## 7. Defect log — the most useful section for your reflection

**Eleven defects. Four were invisible to local testing.** In every one of those four the instrument reported healthy while the feature was broken.

| # | Defect | How it hid | Found by |
|---|---|---|---|
| 1 | Times rendered as `Date(1899,11,30,15,0,0)` | gviz types a `17:00` cell as a time | Local browser test |
| 2 | Searching "italiano" returned 0 results | Sheet stores names in English | Local test |
| 3 | Send button 15px off screen at 375px | Flexbox `min-width:auto` | Local test |
| 4 | Focus never returned on panel close | `document.activeElement` is `body`; `body.focus()` is a no-op | Local test |
| 5 | Message text 19px, spec said 20px | Silent drift | Local test |
| 6 | **FAQ knowledge entirely missing** | Row count read 36 vs 35 uploaded — "close enough" | **Live question battery** |
| 7 | Replies showed raw `**markdown**` | — | Live deployment |
| 8 | **Chat panel open and empty on every load** | `hidden` attribute *was* `true`; an author `display:flex` beat it | **Screenshotting the initial state for the first time** |
| 9 | **Nav link visible pointing at a hidden section** | Same root cause as #8 | Blocked-sheet test |
| 10 | Hero showed "47 courses" after a failed fetch | Hardcoded HTML fallbacks | Blocked-sheet test |
| 11 | **Google Calendar button did nothing** | `window.open` returned `null`, threw nothing, logged nothing | **The user clicked it** |

### The three worth writing about

**#6 — the FAQ.** gviz decides whether row 1 is a header by comparing column *types*. The courses sheet has mixed types so the header was detected. The FAQ sheet is entirely text, so gviz found no header, labelled the columns `A, B, C`, and treated row 1 as data. Every field read as `undefined`. The model was handed `P: undefined R: undefined` 36 times and told visitors it had no information about the **free trial class** — the organisation's single strongest asset. The only visible symptom was one row of drift in a count.

**#8 — the chat panel.** My test checked `panel.hidden` (the attribute, correctly `true`) instead of the computed `display`. The attribute said hidden; the screen said otherwise. It survived because I always clicked the launcher before screenshotting, so I never once looked at the page in its initial state.

**#11 — the Google button.** I had "tested" it by overriding `window.open` and inspecting the URL it received. The URL was correct. **My override replaced the exact thing that was failing.** A test that stubs the browser API under test proves the argument, not the outcome. The fix was not a better `window.open` — it was recognising the control had been built as the wrong *kind of thing*. Opening a calendar is navigation, so it is an anchor.

---

## 8. Testing evidence

| Suite | Cases | Result |
|---|---|---|
| Fee guardrail regex | 24 (11 must block, 13 must pass) | All pass |
| Rate limiter (fake clock) | 9 | All pass |
| Chat card ID extraction | 9 edge cases | All pass |
| Message formatter | 7 incl. XSS probe | All pass |
| `duration_min` parser | 15 | All pass |
| Calendar endpoint resolution | 5 hosts | All pass |
| Live assistant battery | 10 questions | 0 failures |
| CORS preflight | 3 origins | Correct |

**Failure-mode tests** (the ones that matter most):

- **Sheet blocked before page load** → 0 cards, error state, phone number. *Proves no bundled copy exists.*
- **Holidays API killed before page load** → no notice, no console error, everything else renders. *Proves silent degradation.*
- **No API key** → 503 with the phone number, not a crash.
- **`/api/chat` absent (GitHub Pages)** → widget shows the phone number, not an error code.

**Accessibility, measured not assumed:**

| Target | Result |
|---|---|
| Base font | 20px |
| Body contrast | 9.48:1 (AAA) |
| Heading contrast | 18.42:1 |
| Button contrast | 7.14:1 |
| Dark mode body / cards / chat | 9.67 / 8.88 / 14.62 |
| Touch targets under 44px | 1 (a provenance link in the footer) |
| Missing form labels | 0 |
| Images without alt text | 0 |

---

## 9. The fee guardrail — a worked example of layered defence

The organisation publishes no price anywhere. A wrong price is the single error that would cost the most trust, and the person hearing it would have no way to tell.

Enforced **three times independently**:

1. **Rubén's FAQ answer** — the correct response is already in the knowledge base.
2. **The system instruction** — rule 3 of 13, with the correct answer spelled out.
3. **A regex on the response** — if an amount reaches the output, the reply is discarded and replaced.

| Blocked | Allowed |
|---|---|
| `cuesta $15.000 por mes` | `El arancel se paga del 1 al 15` |
| `Son 15.000 pesos mensuales` | `Hay 47 talleres en 2026` |
| `El arancel es de ARS 20000` | `El cupo máximo es de 16 personas` |
| `The fee is around 15000 per month` | `Teléfono 3543 536010` |

The false-positive cases matter as much: an earlier version caught `2026` and `10 inscriptos`, which would have suppressed correct answers about dates and group sizes.

**A related wording fix.** Asked *"¿hay clases el 17 de agosto?"* the assistant replied *"**Sí**, el 17 de agosto es feriado… y ese día no hay clases."* Correct, and it opens with the word meaning the opposite. For an audience that acts on this by travelling to Argüello, that is not a style point. Answers must now open with *"No hay clases el…"*.

---

## 10. Regulatory and Ethical Considerations (~200 words in the report)

Full analysis in `pipeline/08-chatbot-gates.md`.

**EU AI Act, Article 50(1)** — transparency for systems interacting with people. The assistant discloses it is not a person in its first message, before any input, in the page language. Delia explicitly declined to rely on the "obvious to a reasonably well-informed person" exemption: *"not a defence I want to make about a 78-year-old."*

**Article 50(4)** — does not apply; no generated text is published.

**Annex III** — point 3 covers education systems determining access, evaluating outcomes or monitoring students. The assistant answers questions about a published timetable and hands enrolment to a person, so it sits **outside**. Flagged: automating level placement (Italiano III vs IV) *would* be an admission decision and require reassessment.

**Article 5(1)(b)** — prohibits exploiting age-related vulnerability. The audience is defined by age. This is why no urgency, no false scarcity and no fear-based copy appear anywhere, and why the assistant hands over rather than pushing to close.

**GDPR / Ley 25.326:**

| Question | Position |
|---|---|
| Processed | Message text + last 6 turns |
| Where it goes | Google (Gemini), disclosed in the panel in plain words |
| Stored | No conversation logged. One `localStorage` value (`au-theme`). Rate-limit counters keyed by a **salted hash of the IP**, salt generated in memory and never written down, entries expiring after an hour |
| Lawful basis | Art. 6(1)(f) legitimate interest — answering an enquiry, protecting from abuse |
| Special category data | Never asked; someone could volunteer health information in free text. Not storing it is the strongest mitigation |
| Transfers | Outside the EEA, to Google, named in the panel |

**Recorded gap:** the organisation has no published privacy notice. The panel states where messages go, which is the honest minimum, but a notice should exist. Owner unnamed.

---

## 11. Metrics summary

| Category | Figure |
|---|---|
| Agents | 5 personas, ~2,000 words each |
| Pipeline documents | 9 |
| Pipeline runs | 3, in different orders |
| Commits | 27 |
| Source lines | 2,852 across 6 files |
| Live data sources | 4 sheets + 1 public API |
| Rows read live per page load | 81 (47 + 28 + 6) |
| FAQ entries | 35, bilingual, 8 categories |
| Automated test cases | 78 across 8 suites |
| Defects found and fixed | 11 |
| Handoffs returned by the Manager | 1 |
| Designer decisions overruled by the Manager | 2 |
| Features recommended *against* building | 2 (transit, online enrolment) |

---

## 12. Open items (honest status)

1. **GitHub Pages build fails** — repo setting points at `/docs`, which does not exist. Needs Settings → Pages → `main` / `/ (root)`. Code side already fixed.
2. **No named owner** for social posting or phone coverage. Open since the first operating plan. This is what decides whether any of it produces enrolments.
3. **Rate limiting is best-effort** — per-instance memory; a flood spread across Vercel instances gets through. A shared store would fix it and adds a paid service.
4. **Yearly holiday check** against the official decree list — an hour a year, removes the only real risk in that feature.
5. **No privacy notice published.**
6. **Untested with a screen reader.** Markup and live regions verified by inspection and script; nobody has driven it with NVDA, and no one over 50 has used it.
7. **Martín Appendino Fusari** has a biography but teaches no 2026 course.
8. **Art History workshop** has no teacher in any source.

---

## 13. Raw material for your Reflection — questions, not prose

The brief requires this section in your own words. Here are the decision points worth thinking about. **The answers have to be yours.**

**On multi-agent collaboration:**
- The Manager reversed the pipeline order for the assistant (Rubén first). Was that orchestration, or an admission that a fixed pipeline is the wrong model?
- Only one handoff was returned in three runs. Is that a sign the joins were good, or that the reviewer was too permissive?
- Valentina did not work on the assistant at all. Is skipping an agent a strength of the design or a gap in it?

**On what surprised you:**
- Four defects were invisible to local testing and three were caught by a human clicking something. What does that say about testing AI-built systems?
- The FAQ bug is the sharpest: a system that reported healthy while confidently telling prospective students it had no information about the free trial class. What is the general lesson?
- The Google Calendar bug: a test that stubbed the API under test. How would you catch that class of error next time?

**On the agents themselves:**
- Did the personas change the output, or just the prose style? Evidence in both directions exists — Rubén's refusal to invent a testimonial and Delia's stop on online enrolment are behavioural; some of the voice differences are cosmetic.
- The strongest constraint was the shared refusal to state a fee. Would that have emerged without personas?

**On what you would improve:**
- The site defaults to English, which serves a marker rather than the Córdoba over-50s it is actually for.
- Nothing measures whether any of this produced an enrolment.
- The two unnamed owners are the real risk, and no amount of engineering addresses them.

---

## 14. Where everything lives

```
CA3/
├── PROJECT-RECORD.md              this file
├── Context.md                     structured knowledge base
├── programas/                     source document, translations, CSVs
│   ├── courses-2026-ES.csv        47 courses, bilingual
│   ├── teachers-2026.csv          28 teachers, bilingual
│   ├── faq-2026.csv               35 FAQs, bilingual
│   └── info-2026.csv              6 info cards, bilingual
├── aulauniversitaria-agents/      the five personas + team spec
└── aulauniversitaria-website/     the prototype
    └── pipeline/                  9 agent artefacts
```

**Suggested citation of AI use:** Claude Opus 5 (Anthropic) via Claude Code, used for agent persona authoring, code generation, translation and testing. Google Gemini (`gemini-3.5-flash-lite`) is the runtime model inside the deployed assistant. Agent design, orchestration decisions and critical evaluation were directed by the student.
