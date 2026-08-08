# Evidence of handoff: how agent output became agent input

Every quotation below is verbatim from a file in the repository, with its line number. Nothing here is a summary written after the fact.

**Repository:** https://github.com/andresapitt/ceai-c3
**Artefacts:** `aulauniversitaria-website/pipeline/01`–`09`

---

## Exhibit 1. Structural evidence: every artefact names its sender and receiver

Each of the nine pipeline documents opens with routing metadata. This is not decoration: each one states what it received and who it is for.

| Artefact | From | In (received) | To |
|---|---|---|---|
| `01-research-brief.md` | Valentina, Researcher | — | **Tomás, Designer** |
| `02-design-spec.md` | Tomás, Designer | **Valentina's research brief** | **Nadia, Maker** |
| `03-messaging.md` | Rubén, Communicator | **Nadia's working site, plus Valentina's brief** | **Delia, Manager** |
| `04-build-notes.md` | Nadia, Maker | **Tomás's specification, 31 numbered criteria** | **Rubén and Delia** |
| `05-manager-gates.md` | Delia, Manager | the full pipeline | — |
| `06-chatbot-design-spec.md` | Tomás, Designer | **Rubén's FAQ knowledge base (35 entries)**, the live course sheet, Valentina's brief | **Nadia, Maker** |
| `07-chatbot-build-notes.md` | Nadia, Maker | **Tomás's 23 criteria, Rubén's 35 FAQ entries** | **Delia, Manager** |
| `08-chatbot-gates.md` | Delia, Manager | from Rubén's FAQ through to Nadia's deployment notes | — |
| `09-api-research-brief.md` | Valentina, Researcher | — | **Tomás, Designer** |

**Reproduce it yourself:**
```bash
cd aulauniversitaria-website/pipeline
for f in *.md; do echo "--- $f"; grep -m4 -E "^\*\*(From|To|In|Gate):" "$f"; done
```

---

## Exhibit 2. Cross-reference matrix: agents cite each other by name

Counted mechanically across the nine artefacts. An agent working in isolation would have a diagonal matrix. This one is dense off-diagonal.

| Artefact | Valentina | Tomás | Nadia | Rubén | Delia |
|---|---|---|---|---|---|
| 01 Research brief | – | **2** | 0 | 0 | **2** |
| 02 Design spec | **2** | – | **2** | **1** | **2** |
| 03 Messaging | **3** | 0 | **1** | – | **2** |
| 04 Build notes | 0 | **2** | – | **1** | **3** |
| 05 Manager gates | **2** | **3** | **3** | **2** | – |
| 06 Chatbot design | **1** | – | **1** | **2** | **2** |
| 07 Chatbot build | 0 | **2** | – | **3** | **2** |
| 08 Chatbot gates | **1** | **6** | **8** | **7** | – |
| 09 API research | – | **2** | 0 | 0 | 0 |

**The references also survive into the running code**, not just the documents:

| File | Cites |
|---|---|
| `assets/app.js` | Valentina, Nadia |
| `assets/chat.js` | Tomás, Nadia |
| `api/chat.js` | Tomás, Nadia |

```bash
grep -rn "Valentina\|Tomás\|Nadia" assets/*.js api/*.js
```

---

## Exhibit 3. Traceability chain A — the free trial class

One fact, followed from discovery to the words on the live page.

**Step 1 — Valentina discovers it.** `01-research-brief.md:36,63`

> **Finding 3. We are the only one offering a free trial class.**
>
> The free trial class is our only structural advantage over two free competitors and one cheaper one. Nobody encountering us online learns it exists. Evidence: the offer appears once, in the methodology section of the programme document.

**Step 2 — Tomás receives it and names her findings.** `02-design-spec.md:12,14`

> Valentina found three problems. Problem A (the catalogue is invisible) and Problem B (the free trial is buried) are solvable by a page.
>
> Her second finding is the one I built around: nobody in this market publishes a timetable, and we are the only one who can. That is the whole concept. A page whose main object is the live schedule, **with the free trial class as the way in**.

**Step 3 — Tomás converts it into a testable requirement.** `02-design-spec.md:57`

> 15. The free trial class appears in the page title area, above the fold, in the first heading a visitor reads.

**Step 4 — Nadia builds to criterion 15.** `index.html:65`

```html
<h1 data-i18n="hero.title">Elegí un taller. La primera clase es gratis.</h1>
```

**Step 5 — Rubén makes it the campaign, and reasons from Valentina's competitor data.** `03-messaging.md:14,89`

> Pick a course. The first class is free.
>
> Not publishing a fee will lose us some enquiries to UPAMI and the Universidad Provincial, both free… **The trial class is the answer to it.**

**What this proves:** a competitor observation became a design criterion, then an H1, then a marketing strategy. Four agents, one thread, each step citing the last.

---

## Exhibit 4. Traceability chain B — a constraint that travels into source code

This is the strongest single piece of evidence, because a researcher's caveat ends up as a rule inside a build.

**Step 1 — Valentina finds the API and sizes it.** `09-api-research-brief.md:37,41`

> | Course sessions cancelled across the year as a result | **107** |
>
> A student looking at "Italiano I, jueves 15:00" has no way to learn that on 9 July there is no class.

**Step 2 — she attaches a constraint on how it may be used.** `09-api-research-brief.md:45`

> *Caveat I have to record:* argentinadatos.com is a community project, not a government service. It has no uptime guarantee. Anything built on it **needs to degrade to silence rather than to a wrong answer**.

**Step 3 — her constraint appears verbatim in Nadia's source.** `assets/app.js:31–38`

```js
/* Argentine national public holidays. Free, no key, CORS open.
   Valentina's caveat, and the rule this whole feature is built on:
   argentinadatos.com is a community project with no uptime guarantee, so
   this must degrade to SILENCE. It may say "there is no class on this
   date". It must never say "there is a class", and if the API is
   unreachable or returns anything unexpected, the notice simply does not
   appear. A missing notice costs nothing. A wrong one sends a 70 year old
   to Argüello for a locked classroom. */
```

**Step 4 — the constraint was then tested as a requirement.** With the API killed before the page script runs: no notice, empty container, no console error, and the 47 courses, 28 teachers, 6 info cards and week view all still render.

**What this proves:** the Researcher did not merely supply data. She supplied a *governing rule*, the Maker implemented it as written, and it was verified as an acceptance test.

---

## Exhibit 5. Traceability chain C — one rule, three agents, three independent layers

The rule that no agent may state a fee. It exists in three places, put there by three different agents, and each layer is independently sufficient.

**Origin — Valentina establishes the fact.** `01-research-brief.md:72`

> **The fee.** No figure exists in the programme document or on any page of the organisation's site. **I will not estimate one.**

**Layer 1 — Rubén writes the answer into the knowledge base.** Live FAQ sheet, row `F008`:

> **¿Cuánto cuesta?** → *El arancel no está publicado en esta página porque se ajusta durante el año. Llamanos o escribinos por WhatsApp al 351 3 261002 y te decimos el valor…*

**Layer 2 — Tomás makes it a non-negotiable criterion.** `06-chatbot-design-spec.md:34`

> 3. **It never states a fee.** No amount, no range, no "around", no comparison to another provider. Price questions return the payment mechanism and the phone number. This is the single hardest rule and it is not negotiable.

**Layer 3 — Nadia enforces it in code, and cites the test.** `api/chat.js:556–559`

```js
/* Last line of defence on the rule that matters most. If a fee amount ever
   reaches this point, the answer is replaced rather than shown. The model
   is told not to quote a price; this is what catches it when it does.
   Tested against 24 cases in pipeline/07-chatbot-build-notes.md. */
```

**What this proves:** defence in depth arising from three specialists each addressing the same risk from their own discipline. A single agent would plausibly have implemented one layer and considered the job done.

---

## Exhibit 6. The composite artefact — a file no single agent could produce

Below is a real `.ics` generated by the live site for **Italiano I**. Every annotated line traces to a different agent's decision.

```
BEGIN:VEVENT
UID:C030@aulauniversitaria
DTSTART;TZID=America/Argentina/Cordoba:20260305T150000     ← [1]
DTEND;TZID=America/Argentina/Cordoba:20260305T155000       ← [2]
RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=20261130T235900Z          ← [3]
EXDATE;TZID=America/Argentina/Cordoba:20260402T150000      ← [4]
EXDATE;TZID=America/Argentina/Cordoba:20260709T150000      ← [4]
SUMMARY:Italiano I: "Introducción a la lengua italiana"    ← [5]
LOCATION:UBP Campus, Avda. Donato Álvarez 380, Argüello…
DESCRIPTION:Profesor: Carla Palmaghini. … Consultas: 351 3 261002   ← [6]
END:VEVENT
```

| # | Line | Whose decision, and traced from where |
|---|---|---|
| **1** | `DTSTART` | The live course sheet, which exists because **Valentina** audited the catalogue and **Nadia** refused to hardcode it |
| **2** | `DTEND` 15:50 | The `duration_min` column, which exists because **Nadia** flagged in her gap list that a two-hour default was an assumption applied to 40 courses, rather than silently inventing an end time |
| **3** | `RRULE … UNTIL=20261130` | Term end from **Tomás's** spec; the *early* cutoff logic for short courses came from **Nadia** reading the `period` column rather than assuming |
| **4** | Two `EXDATE` lines | **Valentina's** holidays finding (13 dates, 107 sessions), implemented under **her own** degrade-to-silence constraint |
| **5** | Spanish course title | The `course_name_es` column, which exists **only because Delia returned Nadia's handoff** for omitting this from her gap list (Exhibit 7) |
| **6** | A phone number, not a price | **Valentina's** finding, **Rubén's** FAQ answer, **Tomás's** criterion 3 |

**This is the concrete answer to "something no single agent could have produced alone."** A single agent asked to "add a calendar button" produces lines 1, 3, 5 and a guessed duration. It does not produce line 4 without a researcher who found the API *and* set the failure rule, line 2 without a maker who refused to hide an assumption, or line 5 without a manager who caught a gap at a join.

---

## Exhibit 7. Evidence of genuine disagreement, recorded on both sides

This is what distinguishes real handoff from one voice in five costumes: the agents **disagreed, and lost arguments to each other**, and both parties recorded it independently in their own files.

### 7a. The Manager returned a handoff

`05-manager-gates.md:26,29–31`

> | Nadia to Rubén | Yes, with one correction I required. **Nadia's first gap list did not mention that course names render in English. Rubén would have written Spanish copy around English course titles without knowing. I sent it back.** It is now the first row of her gap list | **Returned once, then pass** |
>
> ### The one I sent back
>
> Nadia's build was complete and the gap list was honest about eight things. It missed the ninth, which was the one that affected the next agent. That is not a criticism of the engineering. **It is the reason a handoff gets reviewed by someone whose only job is the join.**

The correction is visible in the receiving artefact: it is now the **first row** of Nadia's gap list in `07-chatbot-build-notes.md`.

### 7b. The Manager overruled the Designer, and both wrote it down

**Delia's account** — `08-chatbot-gates.md:51–55`

> ### What I changed in Tomás's design
>
> He wanted the assistant to open by asking the visitor a question. **I required it to open by disclosing that it is not a person**, before the visitor types anything.
>
> An automated assistant that lets a 70-year-old believe they are talking to a member of staff is precisely the pattern this age group is targeted with.

**Tomás's account, in his own specification** — `06-chatbot-design-spec.md:20–24`

> ## The one thing I argued with Delia about
>
> I wanted the assistant to open with a question. She required it to open with a disclosure. **She was right and it is criterion 4.**

Two agents, two documents, one disagreement, consistent facts, opposite viewpoints. The outcome is enforced in the deployed system: the assistant's first message discloses it is not a person, before any input.

### 7c. The Manager reordered the pipeline

For the assistant, Delia inverted the sequence — Rubén first, not last. `08-chatbot-gates.md`

> Rubén normally works last. Here I sent him first. **A chatbot with no curated knowledge is a model improvising about an organisation**, which is the failure mode I was trying to prevent.

She also declined to involve an agent: *"Valentina did not work on this: no new research was needed, and I will not spend her time to make the diagram symmetrical."*

### 7d. Agents refused work outside their role

- Valentina, `01-research-brief.md`: *"**Design the solution.** That belongs to Tomás. If I catch myself sketching a fix, I stop and put the observation in the brief instead."*
- Tomás, `02-design-spec.md`: *"**Write production code.** That is Nadia's work."*
- Rubén, `03-messaging.md`: *"**I market what exists.** If Nadia says a feature is stubbed, it does not appear in my copy."*

---

## Exhibit 8. Handoff quality was itself measured

Delia reviewed each join against one question: *could the receiving agent actually work from what it was given?*

| Handoff | Verdict | Evidence of the criterion being applied |
|---|---|---|
| Valentina → Tomás | Pass | "Three sized problems, each with a source and a date. Tomás designed for Problem A and B and correctly left Problem C to operations" |
| Tomás → Nadia | Pass | "**the strongest link.** 31 numbered criteria, each checkable. Nadia did not have to ask what any of them meant" |
| Nadia → Rubén | **Returned** | Gap list incomplete in the one respect that affected the next agent |
| Rubén → Delia | Pass | "He told me plainly that not publishing a fee will cost us enquiries" |
| Rubén → Tomás (Run 2) | Pass | "35 entries, both languages, each with a category and an escalate flag. Tomás used the categories to pick the four suggested questions" |

That last row is itself a traceable handoff: Rubén's `category` column became Tomás's four suggested-question buttons, which are visible in the deployed chat panel.

---

## Exhibit 9. Counter-evidence, stated honestly

A marker will ask what the handoffs did *not* prove. Better to answer it first.

1. **The agents did not run as autonomous processes negotiating with each other.** They are personas loaded as system prompts, executed in sequence, with a human directing each run. The handoff is real in that each stage genuinely consumed the previous artefact and produced a distinct one, but no agent independently decided to message another.

2. **Only one handoff of five was returned.** That could mean the joins were good. It could also mean the reviewer was permissive. One data point does not distinguish those.

3. **Some differentiation is stylistic rather than behavioural.** The strongest evidence of genuine difference is behavioural: Rubén refusing to invent a testimonial, Delia stopping online enrolment before design, Valentina refusing to estimate a fee. Voice differences alone would not prove much.

4. **The Manager never disagreed with the Researcher.** Every overrule went to the Designer. A more adversarial setup might have tested Valentina's findings harder.

---

## How to verify any claim in this document

```bash
git clone https://github.com/andresapitt/ceai-c3
cd ceai-c3

# Exhibit 1: routing metadata
for f in pipeline/*.md; do grep -m4 -E "^\*\*(From|To|In):" "$f"; done

# Exhibit 2: cross-references in code
grep -rn "Valentina\|Tomás\|Nadia" assets/*.js api/*.js

# Exhibit 3: the free trial, discovery to H1
grep -n "free trial" pipeline/01-research-brief.md pipeline/02-design-spec.md
grep -n "hero.title" index.html

# Exhibit 4: a researcher's constraint inside the build
grep -n -A 8 "Valentina's caveat" assets/app.js

# Exhibit 7: the disagreement, both sides
grep -n -A 5 "The one I sent back" pipeline/05-manager-gates.md
grep -n -A 5 "argued with Delia" pipeline/06-chatbot-design-spec.md
```
