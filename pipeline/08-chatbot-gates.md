# Chatbot: gate decisions and compliance

**From:** Delia Fontán, Manager
**Covering:** the assistant, from Rubén's FAQ through to Nadia's deployment notes

---

## Decision

**Proceed to deploy, with two conditions.** The assistant goes live on Vercel. It is not linked from Instagram or Facebook until both conditions are met.

1. ~~The FAQ sheet is uploaded and `FAQ_SHEET_ID` is set.~~ **Met.** 35 rows live and verified answering.
2. **Still open.** Rate limiting is added before any campaign drives traffic to it.

### Post-deployment note

Condition 1 was met, and the assistant still could not answer a single FAQ question for the first hour it was live. The sheet was connected, the row count looked right, and the knowledge was not reaching the model. Nadia found it by running a question battery against the deployment rather than by trusting the green light on the selftest.

I am recording this because it is the exact failure this organisation cannot afford: a system that looks configured, reports healthy, and confidently tells a prospective student we have no information about the free trial class. The lesson is not about spreadsheets. It is that "connected" and "working" are different claims, and only one of them was tested.

The condition I am adding for anything we build next: no integration is signed off on a status endpoint alone. Someone asks it real questions and reads the answers.

Reasoning: the assistant answers, at any hour, the questions coordination currently answers one at a time during office hours. It costs nothing to host and it degrades to a phone number when anything fails. The risk is not that it breaks. The risk is that it says something confidently wrong to someone who believes it.

---

## Why I ran this pipeline in a different order

Rubén normally works last. Here I sent him first.

A chatbot with no curated knowledge is a model improvising about an organisation, which is the failure mode I was trying to prevent. So the sequence was Rubén, then Tomás, then Nadia:

```
Rubén  >  Tomás  >  Nadia
FAQ       design    build
       gated by Delia at each join
```

Rubén's 35 answers are the knowledge. Tomás designed around them. Nadia built to Tomás's criteria. Valentina did not work on this: no new research was needed, and I will not spend her time to make the diagram symmetrical.

## Handoff reviews

| Handoff | Could the receiver work from it? | Verdict |
|---|---|---|
| Rubén to Tomás | Yes. 35 entries, both languages, each with a category and an escalate flag. Tomás used the categories to pick the four suggested questions | Pass |
| Tomás to Nadia | Yes. 23 numbered criteria. Nadia met all 23 and found three of her own failures against them | Pass |
| Nadia to me | Yes, and the gap list is honest about the thing that matters: **the model call has never been tested against a real key** | Pass, with conditions |

### What I changed in Tomás's design

He wanted the assistant to open by asking the visitor a question. I required it to open by disclosing that it is not a person, before the visitor types anything.

An automated assistant that lets a 70-year-old believe they are talking to a member of staff is precisely the pattern this age group is targeted with. The disclosure costs one sentence and it is criterion 4.

I also had him put "¿Cuánto cuesta?" first among the suggested questions. It is the question we are least able to answer, and I would rather someone meet that limitation in the first ten seconds, from a button, than after typing a paragraph and getting a deflection.

---

## Regulatory position

Not legal advice. These are the duties I can see. A lawyer confirms them.

### EU AI Act

The static site raised no duties because no AI ran in it. That changes today.

**Article 50(1), transparency for systems that interact with people.** Providers must ensure systems intended to interact directly with natural persons are designed so that the persons concerned are informed they are interacting with an AI system, unless it is obvious to a reasonably well-informed person. We do not rely on the obviousness exemption: this audience includes people with limited exposure to chatbots, and "obvious to a reasonably well-informed person" is not a defence I want to make about a 78-year-old. The first message discloses it, before any input, in the language of the page. Criterion 4.

**Article 50(4), AI-generated text on matters of public interest.** Does not apply. We publish no generated text.

**Annex III, high risk.** Point 3 covers education and vocational training, specifically systems determining access or admission, evaluating learning outcomes, or monitoring students. The assistant does none of these. It answers questions about a published timetable and hands enrolment to a person. It sits **outside** Annex III. If we ever automate placement into levels, for instance deciding whether someone belongs in Italiano III or IV, that is an admission decision and the assessment must be redone before it ships.

**Article 5, prohibited practices.** Worth naming because of who we serve. Article 5(1)(b) prohibits exploiting vulnerabilities due to age to materially distort behaviour in a way that causes significant harm. Our audience is defined by age. This is why no urgency, no false scarcity and no pressure appear anywhere in the assistant, and why it hands over rather than pushing to close.

### GDPR and Ley 25.326

The static page processed nothing. The assistant processes whatever a visitor types.

| Question | Position |
|---|---|
| What is processed | The message text, plus the last six turns for context |
| Where it goes | Google (Gemini API), as a processor, disclosed in the panel in plain words |
| Stored by us | Nothing. No log, no database, no cookie. Refresh and the conversation is gone. The site writes one `localStorage` value, `au-theme`, holding `light` or `dark`: a display preference, not personal data, never transmitted |
| Lawful basis | Legitimate interest in answering an enquiry, Article 6(1)(f). Minimal, because we ask for nothing and keep nothing |
| Special category data | We never ask. Someone could still volunteer health information in a free-text box, for instance asking whether a workshop suits a memory condition. We do not store it, which is the strongest mitigation available |
| Data subject rights | Nothing to access, rectify or erase, because nothing is retained |
| Transfers | Outside the EEA, to Google. Named in the panel. Worth a line in the privacy notice, which we do not currently have |

**The gap I am recording:** the organisation has no published privacy notice. The panel says where messages go, which is the honest minimum, but a notice should exist. Owner unnamed. That is the same unfilled row from the last operating plan and it is now more pressing.

### Trust

The assistant will be wrong sometimes. What matters is what it does when it does not know: it says so and gives a phone number, rather than producing something plausible. Three separate mechanisms stop it stating a price, because a wrong price is the single error that would cost this organisation the most trust, and the person hearing it would have no way to tell.

---

## Risk register

| Risk | Cost | Owner |
|---|---|---|
| The model call fails on first deploy because the model name is wrong | Assistant shows the phone number to every visitor. Detectable in one request via the selftest endpoint | Whoever deploys |
| FAQ sheet never gets uploaded | Assistant cannot answer the most common question. This is condition 1 | Coordination |
| Someone uses it as a free general-purpose model | Gemini quota spent on nothing. No rate limit today | Condition 2 |
| A visitor types health information into the box | We store nothing, so exposure is limited to Google as processor. Cannot be eliminated while a free-text box exists | Accepted |
| Enquiry volume rises and the phone is not covered | Still the worst outcome, and the assistant makes it more likely by working well. Unchanged from the last plan, still unowned | Coordination |
| The sheets stop being shared publicly | Assistant and site both show the phone number. Correct behaviour, no catalogue | Coordination |

---

## Executive summary

We have added an assistant that answers, at any hour, in Spanish or English, from two sources it re-reads on every message: the 47-course timetable and 35 answers Rubén wrote from the programme document.

It tells every visitor in its first sentence that it is not a person. It asks for no personal data. It stores nothing. It cannot state a fee, and that is enforced in three places rather than trusted to a prompt. When it does not know, it says so and gives the number.

What it is not: it is not staffed, it is not rate limited, and its model call has never run against a live key. The first two are conditions on launch. The third is one request away from being verified, and the endpoint to do it with is built.

What I want next, in order: upload the FAQ sheet, run the selftest, add a rate limit, and finally write down who answers the phone when this works.
