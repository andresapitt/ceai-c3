# Build notes: dictation

**From:** Nadia Kaufman, Maker
**In:** Tomás's nine criteria (`10-voice-design-spec.md`), Rubén's copy (`11-voice-disclosure-copy.md`)
**To:** Delia Fontán, Manager
**Built:** 8 August 2026

---

## What shipped

Two files changed. `assets/chat.js` and `assets/chat.css`. Nothing else.

- No change to `api/chat.js`
- No new dependency, no key, no environment variable
- No change to the Vercel function, so no change to the bill
- Roughly 110 lines of JavaScript and 40 of CSS

The API used is `SpeechRecognition`, prefixed `webkitSpeechRecognition` on Chrome and Safari. It hands back a string. There is no `MediaRecorder` in this codebase, no `Blob`, no audio upload and no new request to our own server. Tomás asked for that explicitly and it is worth stating plainly because it is the reason the compliance section is short.

---

## Criteria, and how each one is actually enforced

| # | Criterion | Where it lives |
|---|---|---|
| 1 | Never auto-send | `rec.onresult` writes to `input.value` and nothing else. There is no call to `send()` anywhere in the dictation code |
| 2 | Absent if unsupported | The button is created with `hidden` set, and the attribute is only removed when `dictationAvailable()` passes |
| 3 | Appends, never overwrites | `dictated` is seeded from `input.value` before `start()` |
| 4 | Visible state, not colour | `.chat-mic-status`, a `role="status"` paragraph. One element is both the visible line and the announcement |
| 5 | Every failure ends at the keyboard | `MIC_ERRORS` maps four codes to four sentences, and `default` catches everything else |
| 6 | Closing stops the microphone | `close()` calls `stopDictation(true)`, which calls `abort()` |
| 7 | Follows the page language | `rec.lang` set from `lang()` at each start, and the language observer aborts an in-flight session |
| 8 | 48px target | `.chat-mic` is 48px, 44px under 760px wide |
| 9 | Degrades in print | Inherited: `@media print` already hides the whole panel |

---

## Two decisions I made that Tomás did not specify

**Focus stays on the microphone button when dictation ends.** The obvious move is to focus the input so the person can edit. On a phone that raises the on-screen keyboard over the panel, for the exact person who pressed the microphone in order to avoid the keyboard. Focus stays on the button, and Send is one tab away.

**`stop()` from the button, `abort()` from everywhere else.** They differ: `stop()` finalises what was heard, `abort()` discards it. Pressing the button means "I have finished speaking", so it finalises. Closing the panel, switching language and sending all mean "this is over", so they discard. Three places call `abort()` and one calls `stop()`.

There is also a 20 second hard timer. Chrome ends on silence by itself, some WebKit builds do not, and an open microphone that nobody closed is the failure that actually matters here.

---

## Testing

The recogniser needs a microphone and a network speech service, so it cannot be driven headlessly. I want to be exact about what was proven and what was not.

**What was tested, with a fake recogniser injected before `chat.js` runs: 45 assertions, all passing.**

- Button visible with the API present, `display:none` with it absent. Computed style, not the attribute. That distinction has caught us three times on this project and I am not trusting `hidden` again
- Append: typed text plus interim result plus final result, in that order, produced the expected string
- Interim results are replaced by the final, not appended twice
- All four error codes produce four different sentences, every one of them containing "or type your question", none of them containing the error code
- `aborted` produces no message at all, because that is the visitor pressing stop
- Close, send and language switch each call `abort()`, and each clears the listening class, the `aria-pressed` state and the status line
- English page requests `en-GB`, Spanish page requests `es-AR`, and switching mid-session aborts rather than transcribing Spanish with an English model
- The full privacy line appears when the button exists, the short one when it does not
- Zero requests to `/api/chat` across every dictation path

**Narrow layout, measured rather than screenshotted.** Headless Chrome ignores the viewport meta without device emulation, so a 375-wide capture shows a clipped desktop layout and would misrepresent the build. I measured the panel forced to three widths instead:

| Panel width | Input | Mic | Send | All inside the form |
|---|---|---|---|---|
| 359px (what a 375px phone gives) | 189px | 44 x 48 | 80px | yes |
| 335px | 165px | 44 x 48 | 80px | yes |
| 300px, narrower than any real phone | 130px | 44 x 48 | 80px | yes |

The microphone never shrinks below 44px because it is `flex:0 0 auto`. The input absorbs all the loss.

**One defect found by looking at my own evidence.** Screenshot 22 showed the Firefox case with no microphone button and a privacy line that still explained dictation. A promise about a feature that browser will never display. Added `privacyPlain` and picked between the two on `micBtn.hidden`. Recaptured.

---

## Gap list

Delia asked for these on every build and this one has real ones.

1. **No real speech has passed through this.** Every state is proven with a fake recogniser. The transcription quality, the timing of interim results on a slow connection, and the actual permission prompt are all untested. This is the first feature on this project I am handing over without an end-to-end test, and it needs one on Chrome desktop, Android Chrome and iOS Safari before anyone is told it exists.
2. **Proper nouns will be wrong.** "Vida AMAble", "Bridge", "Cata de Libros". Criterion 1 is the mitigation, not a fix, and it depends on people actually reading the box before sending.
3. **Firefox users get nothing.** Roughly one in twenty visitors. They see the interface exactly as it was yesterday, which is the correct outcome, but it is still a gap.
4. **The 20 second cap is arbitrary.** It came from me, not from watching anyone speak. If people are routinely cut off mid-question it is too short, and there is no way to find that out except by asking.
5. **`aria-pressed` on a toggle that also changes label is belt and braces.** Some screen reader and browser pairs announce it twice. I would rather that than silence, but it is not ideal and I have not tested it with NVDA or VoiceOver.
