# Design specification: aulauniversitaria public site

**From:** Tomás Iriarte, Designer
**In:** Valentina's research brief, 6 August 2026
**To:** Nadia Kaufman, Maker
**Gate:** approved by Delia Fontán

---

## What I took from the brief

Valentina found three problems. Problem A (the catalogue is invisible) and Problem B (the free trial is buried) are solvable by a page. Problem C (the old site contradicts the programme) is solved by replacing what is published, not by design work.

Her second finding is the one I built around: nobody in this market publishes a timetable, and we are the only one who can. That is the whole concept. A page whose main object is the live schedule, with the free trial class as the way in.

---

## The concept, and the two I rejected

| Concept | What it is | Decision |
|---|---|---|
| **A. A brochure site** | Pages about the programme, its mission and its history, with a PDF of the catalogue | Rejected. It reproduces the current failure in a newer font. A PDF is not a timetable |
| **B. A course finder built on the live sheet** | One page. Search and filter across every offering, read live, plus a week view and a three-step path to a trial class | **Chosen** |
| **C. Finder plus online enrolment and payment** | Concept B with accounts, a booking flow and card payment | Rejected for now. The organisation collects fees monthly between the 1st and the 15th and has no engineer. A booking system nobody can staff is a plan without an owner. Delia agreed |

---

## Numbered acceptance criteria

Nadia builds against these. Each one is checkable.

### Data

1. Every course fact on the page comes from the coordination sheet, fetched over the network when the page loads.
2. No course name, day, time, teacher, period or capacity appears anywhere in the source files.
3. If the fetch fails, the page shows an error and the phone number. It never shows a stored copy.
4. The time the data was read is displayed on the page.
5. If the sheet later gains a `course_name_es` column, the page uses it without a code change.

### The finder

6. A free-text search covering course name, teacher, area, level and notes.
7. Three filters: day, area, format. Each populated from the values actually present in the sheet, not a fixed list.
8. The result count is announced to screen readers when it changes.
9. A visible control clears every filter at once.
10. A search in Spanish finds a course whose name is stored in English. A person types "italiano" and finds Italian I.
11. Zero results is a helpful state, not an empty box. It offers the phone number.

### The week view

12. Every offering appears under its day, ordered by time.
13. A course with two alternative slots appears under both days.
14. The Thursday 15:00 clash is displayed as it is. We do not hide a real scheduling conflict.

### The path to a trial class

15. The free trial class appears in the page title area, above the fold, in the first heading a visitor reads.
16. Exactly three steps between arriving and attending: choose, contact, come.
17. Each course card has a direct enquiry action that names that course in the message.
18. No form. No account. No field asking for a national ID, a date of birth or an address. The organisation converts people by phone and WhatsApp, and the design routes to those rather than around them.

### Words

19. Spanish is the default. Argentine Spanish with voseo, written for Córdoba.
20. No age appears in any headline. "Over 50" is who we serve, not how we address them.
21. The fee question is answered honestly on the page: paid monthly, discounted between the 1st and the 15th, amount by phone. No figure is printed, because none exists in any source.

### Accessibility

22. Body text at 20px by default. Not 16px with a large-text mode bolted on.
23. Body copy contrast at 7:1 or better against its background. Headings likewise.
24. Every interactive target at least 48px high, including the enquiry link on all 47 cards.
25. Visible focus outline on every focusable element, at least 3px, offset from the element.
26. Every form control has a real label element. No placeholder-as-label.
27. One h1. Landmarks for header, nav, main and footer.
28. No interaction that requires hovering. No carousel. No timed content.
29. Motion respects `prefers-reduced-motion`.
30. The page works in a light and a dark colour scheme, both at the same contrast standard.
31. At 375px wide the header takes less than a third of the screen before content begins.

---

## The one thing I argued about with myself

My own belief says that if an interface needs a large-text mode, the normal setting is already wrong. I still specified an A+ control at criterion 22.

The reason: the default is 20px, which is already the accessible size, so the control is not compensating for a bad default. It exists because some of this audience runs a magnifier and some do not, and the ones who do not still occasionally want bigger type on a small phone. I would remove it if it were doing the job the default should be doing. It is not.

---

## What I did not specify

- Photographs of students. The organisation has no consented image library that I know of, and stock photography of older adults is exactly the patronising register Rubén will refuse. Left out.
- A chatbot. There is no service question a live schedule does not answer better, and a bot would add a transparency duty for no gain.
- Teacher biography pages. Worth doing. Not in this build. In the cut list.

## Cut list, in order, for a second pass

1. Teacher pages, one per person, with the biography we already hold for 22 of the 27.
2. A `course_name_es` column so course names read in Spanish.
3. A printable weekly timetable, since some of this audience will want it on paper.
4. Consented photographs from real classes.
