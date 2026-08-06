# Design specification: the aulauniversitaria assistant

**From:** Tomás Iriarte, Designer
**In:** Rubén's FAQ knowledge base (35 entries), the live course sheet, Valentina's brief
**To:** Nadia Kaufman, Maker
**Gate:** approved by Delia Fontán, with one condition (see criterion 4)

---

## What this is for, and what it is not

The finder answers "what is on at 3pm on a Thursday". It does not answer "I did Italian at school forty years ago, which level am I?" or "my mother lives in Argüello, is there anything for her on a Monday morning?"

Those are the questions people currently ring up to ask, in office hours, one at a time. The assistant takes the ones that have a documented answer and leaves the rest to the phone.

It is not a salesperson. It is not a replacement for coordination. Its most valuable single behaviour is handing over to a person at the right moment.

---

## The one thing I argued with Delia about

I wanted the assistant to open with a question. She required it to open with a disclosure. She was right and it is criterion 4.

An automated assistant that lets an 70-year-old believe they are talking to a person is exactly the pattern this audience gets exploited with. The disclosure costs one sentence.

---

## Numbered acceptance criteria

### Grounding

1. Every answer comes from two live sources fetched at request time: the course sheet and the FAQ sheet. No knowledge is compiled into the code or the prompt file.
2. If the assistant cannot answer from those sources, it says so plainly and gives the phone number. It does not reason its way to a plausible answer.
3. **It never states a fee.** No amount, no range, no "around", no comparison to another provider. Price questions return the payment mechanism and the phone number. This is the single hardest rule and it is not negotiable.
4. **The first message discloses that it is an automated assistant**, before the visitor types anything, in the language of the page.
5. It never invents a course, a teacher, a day, a time or a capacity. If the sheet does not say it, it does not exist.
6. It answers in the language the visitor writes in.

### Behaviour

7. It hands over to a person whenever the visitor asks to enrol, asks about money, asks something outside the sources, or seems stuck. Handover means the WhatsApp link and the phone number, not "contact us".
8. It answers in short paragraphs, not essays. Three sentences beats ten.
9. It cites which course it is talking about by name when the answer comes from the course sheet.
10. It does not ask for personal data. Not a name, not an email, not a phone number, not an age.

### Interface

11. A launcher button that says what it is in words, not a lone icon. An icon alone is a guess for this audience.
12. Opens as a panel, not a full-screen takeover. The visitor must not lose the page behind it.
13. **Suggested questions as tappable buttons** on first open. A blank text box is an exam. Four buttons drawn from the FAQ categories are an invitation.
14. Text input at 18px minimum, send button 48px minimum.
15. New messages announced to screen readers through a live region.
16. Closable with the Escape key and with a labelled close button.
17. Focus moves into the panel on open and returns to the launcher on close.
18. The conversation is readable at 20px with the same contrast standard as the rest of the page.
19. Works at 375px wide without covering the phone number.
20. If the assistant is unavailable for any reason, the panel shows the phone number rather than an error code.

### Privacy

21. No conversation is stored on a server, in a log, or in a cookie.
22. No analytics, no tracking, no third party beyond the model provider.
23. The panel says where the messages go, in one sentence, without jargon.

---

## Suggested questions, on first open

Drawn from the categories Rubén found most common. Four, not eight.

- ¿Cuánto cuesta?
- ¿Puedo probar una clase antes?
- ¿Qué talleres hay los martes?
- ¿Dónde son las clases?

The first is deliberate. It is the question people most want answered and the one the assistant is least able to answer. Putting it first means the visitor meets the honest limitation immediately, from a button, rather than after typing a paragraph.

---

## What I cut

- **Voice input.** Tempting for this audience and a much larger build. Cut list.
- **Conversation history across visits.** Requires storage, which requires a lawful basis, for a benefit nobody asked for.
- **A name for the assistant.** A friendly human name works against criterion 4. It is "el asistente", and it is honest about what it is.
- **Proactive opening after a delay.** Popping up unprompted is a dark pattern dressed as helpfulness.
