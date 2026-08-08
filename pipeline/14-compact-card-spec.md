# Design note: compact cards for long result lists

**From:** Tomás Iriarte, Designer
**In:** a defect report from the site owner, and the measurement Nadia took on the live site
**To:** Nadia Kaufman, Maker
**Gate:** Delia Fontán

---

## The report, and what was actually behind it

The report was "when I ask about a course it lists all the courses". The scroll position was fixed separately and was the larger half of it. This note is about the half that remains.

Nadia measured it: asking about Italian returns eight cards at roughly 300px each, about 2400px of content in a panel 400px tall. Eight cards is correct. There are eight Italian offerings and the server caps the list at eight. Nothing lied. But one card at a time on screen is not a list, it is a slideshow, and you cannot compare things you cannot see together.

---

## The decision

**At five cards or more, the card changes shape.**

Below five, nothing changes. Someone looking at two or three results is deciding, and deciding needs the teacher, the level, the period and the places.

At five or more they are not deciding, they are scanning. They are working out which two or three are worth a closer look. Everything that does not help them narrow the list is in the way.

**A compact card carries:** the course name, the day and time, the format, the category, and the enquiry link.

**A compact card drops:** teacher, level, period, capacity, and the alternate session line.

None of that is lost. It is on the page itself, in the finder, and it is one tap away through the enquiry link that stays on every card.

---

## Three things I am not doing, and why

**I am not lowering the cap below eight.** Showing five of eight Italian courses and staying quiet about the other three would be a worse failure than a long list. The visitor would choose from an incomplete set without knowing it was incomplete.

**I am not shrinking the enquiry link.** It stays at 44px. That button is the handoff to a person, which is the thing this whole system is built around. Compactness is not a reason to make the exit harder to hit.

**I am not making the whole card clickable.** It would look tidier. But the link goes to WhatsApp, and a card that silently opens a messaging app because someone tapped near the title is the kind of surprise that costs trust with this audience permanently.

---

## One addition

**Put a count above a compact list.** "8 courses", "8 talleres".

The original complaint was disorientation, not density. A number at the top tells someone how much is below them before they start scrolling, which is the single cheapest thing that fixes not knowing where you are. It is also honest in a way the list alone is not: eight is the cap, so a count of exactly eight is worth being able to see.

---

## Nadia's note back

Built as specified. Threshold in one constant, `COMPACT_AT`, so it can be moved without hunting through the render function.

Measured after: the eight-card Italian answer went from 2383px to 1259px of card content, a reduction of 47%. Roughly two and a half cards now fit on screen at once instead of just over one. A two-card answer is byte-for-byte unchanged.

The count line sits outside the element carrying `role="list"`, because a paragraph inside a list role is not valid.
