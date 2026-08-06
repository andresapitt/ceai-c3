# Chatbot build notes and gap list

**From:** Nadia Kaufman, Maker
**In:** Tomás's 23 criteria, Rubén's 35 FAQ entries
**To:** Delia Fontán
**Gate:** approved, conditional on the two items in section 6

Caveats first. Section 5 is the part to read before demoing this.

---

## 1. What runs

```
api/chat.js        Vercel serverless function, calls Gemini
assets/chat.js     the widget
assets/chat.css    the widget styling
vercel.json        headers
.env.example       the names of the environment variables, no values
```

Static hosting alone cannot do this: the API key has to live somewhere the browser cannot read. Vercel serves the same static page plus one function on one origin, so there is no CORS to configure and no second host to keep alive.

## 2. Where the knowledge comes from

Two live reads on **every single message**, not at deploy, not on a timer:

| Source | Rows | Contains |
|---|---|---|
| Course sheet | 47 | Names in both languages, day, time, teacher, format, level, period, capacity, notes |
| FAQ sheet | 35 | Rubén's questions and answers in both languages, with a category and an escalate flag |

Both are Google Sheets read through gviz, no API key, shared read-only by link. If either is unreachable the assistant says so and gives the phone number. There is no bundled copy to fall back to.

That means a workshop cancelled in the sheet at 09:00 is unknown to the assistant at 09:01.

## 3. The model

`gemini-2.5-flash` by default, overridable with the `GEMINI_MODEL` environment variable.

I could not test against the live API because I have no key. **The model name is the most likely thing to be wrong on your first deploy**, so I built a diagnostic instead of guessing:

```
GET /api/chat?selftest=1
```

It returns whether the key is present, which model is configured, **which models your key can actually reach**, and how many rows each sheet returned. It never returns the key. If the chat 502s, that endpoint tells you why in one request.

## 4. The fee guardrail

The rule everyone agreed matters most is that the assistant must never state a price, because no price exists in any source.

It is enforced three times:

1. **The FAQ answer.** Rubén wrote the price question so the correct answer is already in the knowledge base.
2. **The system instruction.** Rule 3 of 10, stated explicitly, with the correct answer spelled out.
3. **A regex on the way out.** If an amount reaches the response anyway, the reply is discarded and replaced with the mechanism plus the phone number.

Layer 3 is tested. 24 cases, 11 that must be blocked and 13 that must pass:

| Blocked | Allowed |
|---|---|
| `cuesta $15.000 por mes` | `El arancel se paga del 1 al 15` |
| `Son 15.000 pesos mensuales` | `Hay 47 talleres en 2026` |
| `El arancel es de ARS 20000` | `El cupo máximo es de 16 personas` |
| `El arancel mensual es de 25000` | `Teléfono 3543 536010` |
| `The fee is around 15000 per month` | `Son 140 años de inmigración japonesa` |

The false-positive cases matter as much as the blocks. An earlier version caught `2026` and `10 inscriptos`, which would have suppressed correct answers about dates and group sizes.

## 5. The gap list

| Gap | Detail |
|---|---|
| **Never tested against the real Gemini API** | Every path is tested except the one that needs a key: sheet reads, prompt assembly, the guardrail, the no-key degradation, the 405, the widget, and the offline state. The model call itself is **untested**. Use the selftest endpoint first |
| **The FAQ sheet is not uploaded yet** | `FAQ_SHEET_ID` is unset, so the assistant currently runs on courses alone. It works, but it cannot answer about fees, certificates or absence policy until the FAQ sheet exists |
| **No rate limiting** | Anyone can post to `/api/chat` as fast as they like, and each call spends Gemini quota and reads two sheets. Vercel's platform limits are the only ceiling. Fine for a prototype, not for an unattended public launch |
| **No abuse handling beyond the model's own filters** | Safety settings are set to block medium and above on the four standard categories. Nothing stops someone using it as a free general-purpose model, other than the system instruction telling it to answer only from the data |
| **Conversation history is client-side only** | Last six turns are sent back with each message. Refresh the page and the assistant forgets. Deliberate, per criterion 21 |
| **Untested with a screen reader** | The live region, labels and focus handling are correct by inspection and by scripted test. Nobody has driven it with NVDA |
| **Prompt size grows with the catalogue** | 47 courses and 35 FAQs is a comfortable prompt. At 300 courses it would need retrieval rather than sending everything |

## 6. Conditions Delia attached

1. Do not link the assistant from social media until the FAQ sheet is live. Without it the assistant cannot answer the fee question from the knowledge base, and that is the most common question.
2. Add rate limiting before any campaign drives traffic.

## 7. Three bugs I found by testing, not by reading

1. **The send button hung 15px off the right edge at 375px.** Flexbox defaults a flex item to `min-width:auto`, so the text input refused to shrink and pushed the button off screen. `min-width:0` on the input. Invisible on desktop, and the single most-used control on a phone.
2. **Focus never returned when the panel closed.** `document.activeElement` is `body` when nothing else is focused, and `body.focus()` is a no-op, so a keyboard user pressing Escape was stranded at the top of the page. Now checks the element is genuinely focusable and still in the document, since a suggestion chip removes itself when clicked.
3. **Message text rendered at 19px** where Tomás specified 20px. Small, and exactly the kind of drift that makes a page feel subtly harder to read.

## 8. Deploying it

1. Import the GitHub repository into Vercel. No build command, no framework preset.
2. Add environment variables under Project Settings, Environment Variables:
   - `GEMINI_API_KEY` from `https://aistudio.google.com/apikey`
   - `FAQ_SHEET_ID`, the ID of the uploaded FAQ sheet
   - `GEMINI_MODEL` only if the selftest says the default is unavailable
3. Deploy, then open `/api/chat?selftest=1` and confirm `keyPresent: true`, both sheet counts non-zero, and the configured model present in `availableModels`.
4. Open the site and ask it "¿cuánto cuesta?". The correct answer names the payment window and the phone number, and contains no amount.

The key is set in Vercel and never in the repository. `.gitignore` covers `.env` and `.env.local`. I ran a secret sweep before committing.
