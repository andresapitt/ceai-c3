# Design specification: dictation in the assistant

**From:** Tomás Iriarte, Designer
**In:** the working assistant, Valentina's audience notes, my own 23 chatbot criteria
**To:** Nadia Kaufman, Maker, and Rubén Salvatierra, Communicator
**Gate:** Delia Fontán

---

## Why this is worth building at all

I want to be honest about the reason, because it is not the reason people usually give for voice input.

The usual argument is that it is faster. It is not, for most people. The argument that holds here is narrower and stronger: a share of our audience finds typing on a phone genuinely hard. Arthritis, tremor, cataracts, reading glasses that are in the other room. These are not edge cases in a programme whose students are mostly over sixty. Every one of those people currently has one option for asking a question, which is to ring during office hours.

So the success measure is not speed. It is whether someone who cannot comfortably type can now ask a question at nine on a Sunday evening.

That framing decides most of what follows.

---

## The criteria

**1. The dictated text goes into the box. It is never sent automatically.**

This is the one I will not negotiate. Speech recognition gets proper nouns wrong, and our catalogue is full of them. "Vida AMAble" will not survive. If the system sends on its own, a misheard question is already gone and the person has to work out what happened. If it lands in the input, they read it, fix it, and press Send. The extra tap is the feature.

**2. If the browser cannot do it, the button does not exist.**

Not disabled. Not greyed. Absent. Firefox has never shipped this API. A control that is visibly there and does nothing when pressed is worse than no control, especially for someone who will assume they pressed it wrong.

**3. Dictation appends, it does not overwrite.**

If someone has typed half a question and then presses the microphone, the half they typed stays. Wiping it is the kind of small betrayal that stops people trying again.

**4. The listening state must be visible without colour.**

A red button is not a state. While it is listening there must be a text line that says so, in the same panel, in words. That line does double duty as the screen reader announcement, so it is one element rather than two.

**5. Every failure ends in the same place: the keyboard still works.**

Permission denied, no microphone, no network, nothing heard. Four different causes, four different sentences, one identical outcome. One line of plain text inside the panel, no dialog, no error code, and the input is still there. Nobody is ever stuck.

**6. Closing the panel stops the microphone.**

If the panel is closed and the microphone is still open, we have built a listening device. This is not a nicety, it is the difference between a feature and an incident.

**7. It follows the page language.**

We already have a toggle and the assistant already follows it. Recognition must be set to Argentine Spanish, not generic Spanish, and to English when the page is in English. Regional Spanish recognition of "che" and "vos" is measurably better than the Iberian default.

**8. Same 48px target as everything else.**

The rest of this interface holds to 48px minimum. A 32px microphone icon because it looks tidier would undo the reason we set the rule.

**9. It reduces to nothing gracefully in print and in the offline state.**

Already true of the panel. Just do not break it.

---

## What I am explicitly not asking for

**No recording sent to our server.** The browser API returns text. I do not want an audio file existing anywhere in this system, even briefly, because the moment one does we own a retention policy, a deletion route and a subject access request procedure that this organisation has nobody to run. The weaker browser support is worth that.

**No voice output in this pass.** Reading answers aloud is the obvious companion and I think it is probably more valuable than dictation for this audience. It is also a separate decision with its own consent question, and bundling two features makes it impossible to tell which one people used. Ship this, watch it, then decide.

**No wake word, no continuous listening, no "hands free mode".** One press, one question.

---

## Handoff to Rubén

The privacy line in the panel currently names one processor, Gemini. Dictation adds a second one that is not us and not Gemini: the browser's own speech service, which is Google on Chrome and Apple on Safari. The audio leaves the device even though it never touches our server.

I am not writing that sentence. I would write it like a lawyer. It needs to say, in both languages, at a reading age this audience should not have to work at: your voice is turned into text by your browser, we only get the words, we keep neither.

Rubén writes it, Nadia installs it, and it ships in the same commit as the button, not after.
