# Gate decision: dictation

**From:** Delia Fontán, Manager
**Covering:** `10-voice-design-spec.md` through `12-voice-build-notes.md`
**Date:** 8 August 2026

---

## Decision

**Ship, with one condition and one refusal.**

The code goes live. It is small, it is contained, it costs nothing to run, and it fails safely. Everything else about this feature is about what we say and when.

**Condition.** Nadia's gap 1 must be closed before this is mentioned to anybody. Someone has to press the button on a real phone and speak a real sentence. Three devices: an Android phone, an iPhone, and a desktop Chrome. Fifteen minutes of somebody's time. Until that is done the feature is live but unannounced, which is exactly the state Rubén recommended anyway for entirely different reasons.

**Refusal.** I am not approving voice output in the same release, and I want the reason recorded rather than inferred. Tomás already set it aside and I agree, but my reason is different from his. His is measurement. Mine is that reading answers aloud in a public place discloses what someone asked, and a page whose most-asked question is about money should not broadcast the answer across a waiting room. That deserves its own decision, not a paragraph in this one.

---

## Why I approved something with an untested core

I have refused work on this project for less. The distinction matters, so here it is.

Everything that can fail here fails into the state the site was in yesterday. If the API is missing, the button does not appear. If permission is refused, a line of text appears and the keyboard still works. If the browser hears nothing, same. If the recogniser mishears entirely, the wrong words sit in a box the person is looking at, and they fix them or clear them.

There is no path in Nadia's code where a person ends up worse off than if we had never built it. That is what makes an untested recogniser acceptable and it is not a general licence.

Compare the FAQ failure in `08-chatbot-gates.md`. That one shipped with a condition marked met, and the assistant then answered questions with no knowledge behind it for an hour. The difference is that a silent wrong answer looks exactly like a right one. A microphone that does not work looks like a microphone that does not work.

---

## Compliance

**Data protection.** The audio never reaches us. The browser transcribes it through its own service, Google on Chrome and Apple on Safari, and returns text. We are not a controller for the audio and we do not process it. What we do have is a disclosure duty about the onward transfer, and Rubén's line meets it in both languages, naming both companies. GDPR Art. 13, and Ley 25.326 locally.

**Not biometric.** Voice is special category data under Art. 9 when it is processed *to identify someone*. We process it to obtain words. No voiceprint, no template, no retention, no comparison against anything. This is out of scope for Art. 9 and I am recording the reasoning here so nobody has to reconstruct it later.

**EU AI Act.** The Art. 50(1) disclosure obligation was already met by the assistant's opening message, which has not changed. There is no emotion inference anywhere in this feature, so Art. 5(1)(f) is not engaged. Adding an input method does not change the system's classification.

**The one that needed thinking about.** A microphone control on a page used by older adults, some with cognitive decline, sits near enough to Art. 5(1)(b) that I looked at it properly. That provision is about exploiting vulnerability to distort behaviour and cause harm. This button removes a barrier and takes nothing. It is not close. But I would rather write down that I checked than have someone ask me in a year whether I did.

---

## Two things I am carrying forward, not closing

- **Nobody owns the device test.** Same shape as the two items still open on the social posting and the yearly holiday check. I can write the condition; I cannot staff it. This is the third time this has come up and it is starting to be the real risk on this project rather than any single feature.
- **We will not know if anyone uses it.** There is no analytics on this site by deliberate choice and I am not reversing that for a button. The only evidence available is coordination noticing whether questions arriving through the assistant start sounding more like speech than typing. I have asked them to mention it if they notice. That is a weak instrument and I am recording it as weak rather than pretending it is a measurement plan.
